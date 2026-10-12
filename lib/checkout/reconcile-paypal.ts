import { prisma } from "@/lib/prisma";
import {
  finishPayPalAttemptWithoutPayment,
  markPayPalAttemptPaid,
} from "@/lib/checkout/payment-state";
import {
  getPayPalCapture,
  getPayPalPurchaseUnit,
} from "@/lib/checkout/paypal-order-validation";
import {
  capturePayPalOrder,
  createPayPalOrder,
  getPayPalOrder,
  PayPalApiError,
} from "@/lib/paypal";

const RECONCILE_BATCH_SIZE = 5;
const CAPTURE_STALE_GRACE_MS = 2 * 60 * 1000;
const RETRY_DELAY_MS = 15 * 60 * 1000;

type AttemptWithOrder = NonNullable<
  Awaited<ReturnType<typeof findExpiredAttempts>>
>[number];

async function findExpiredAttempts(now: Date) {
  const staleCutoff = new Date(now.getTime() - CAPTURE_STALE_GRACE_MS);
  return prisma.paymentAttempt.findMany({
    where: {
      provider: "PAYPAL",
      expiresAt: { lte: now },
      OR: [
        { status: { in: ["pending", "approved"] } },
        {
          status: { in: ["capturing", "reconciling"] },
          updatedAt: { lte: staleCutoff },
        },
      ],
    },
    include: { order: true },
    orderBy: { expiresAt: "asc" },
    take: RECONCILE_BATCH_SIZE,
  });
}

async function claimAttempt(
  attempt: AttemptWithOrder,
  now: Date,
): Promise<boolean> {
  const where = {
    id: attempt.id,
    status: attempt.status,
    expiresAt: { lte: now },
    ...(attempt.status === "capturing" || attempt.status === "reconciling"
      ? { updatedAt: { lte: new Date(now.getTime() - CAPTURE_STALE_GRACE_MS) } }
      : {}),
  };
  const claimed = await prisma.paymentAttempt.updateMany({
    where,
    data: { status: "reconciling" },
  });
  return claimed.count === 1;
}

async function loadOrCreatePayPalOrder(attempt: AttemptWithOrder): Promise<string> {
  if (attempt.providerOrderId) return attempt.providerOrderId;
  const created = await createPayPalOrder({
    reference: attempt.order.providerReference,
    orderId: attempt.orderId,
    amountCents: attempt.amountCents,
    currency: attempt.currency,
    requestId: attempt.idempotencyKey,
    shipping: {
      fullName: `${attempt.order.customerFirstName ?? ""} ${attempt.order.customerLastName ?? ""}`.trim(),
      addressLine1: attempt.order.shippingLine1 ?? "",
      addressLine2: attempt.order.shippingLine2,
      city: attempt.order.shippingCity ?? "",
      state: attempt.order.shippingState ?? "",
      postalCode: attempt.order.shippingPostalCode ?? "",
      countryCode: attempt.order.shippingCountry?.toUpperCase() ?? "",
    },
  });
  if (typeof created.id !== "string" || !created.id || created.id.length > 64) {
    throw new Error("PayPal did not return a valid order ID during reconciliation.");
  }
  const linked = await prisma.paymentAttempt.updateMany({
    where: { id: attempt.id, status: "reconciling", providerOrderId: null },
    data: { providerOrderId: created.id },
  });
  if (linked.count !== 1) {
    const saved = await prisma.paymentAttempt.findUnique({
      where: { id: attempt.id },
      select: { providerOrderId: true },
    });
    if (saved?.providerOrderId !== created.id) {
      throw new Error("Unable to link the reconciled PayPal order.");
    }
  }
  return created.id;
}

async function deferAttempt(
  attempt: AttemptWithOrder,
  status: "pending" | "approved" | "capturing",
  now: Date,
) {
  await prisma.paymentAttempt.updateMany({
    where: { id: attempt.id, status: "reconciling" },
    data: {
      status,
      expiresAt: new Date(now.getTime() + RETRY_DELAY_MS),
    },
  });
}

function getCompletedCaptureId(
  paypalOrder: Record<string, unknown>,
  attempt: AttemptWithOrder,
  paypalOrderId: string,
): string | null {
  if (paypalOrder.status !== "COMPLETED") return null;

  const purchaseUnit = getPayPalPurchaseUnit(paypalOrder, {
    providerOrderId: paypalOrderId,
    orderId: attempt.orderId,
    amountCents: attempt.amountCents,
    currency: attempt.currency,
    order: { providerReference: attempt.order.providerReference },
  });
  if (!purchaseUnit) return null;

  const payments = purchaseUnit.payments;
  if (
    !payments ||
    typeof payments !== "object" ||
    !("captures" in payments) ||
    !Array.isArray(payments.captures)
  ) {
    return null;
  }
  const capture = payments.captures.find(
    (candidate): candidate is Record<string, unknown> =>
      !!candidate &&
      typeof candidate === "object" &&
      "id" in candidate &&
      typeof candidate.id === "string" &&
      getPayPalCapture(
        purchaseUnit,
        candidate.id,
        "COMPLETED",
        attempt.amountCents,
        attempt.currency,
      ) !== null,
  );
  return capture && typeof capture.id === "string" ? capture.id : null;
}

async function markCompletedOrderPaid(
  paypalOrder: Record<string, unknown>,
  attempt: AttemptWithOrder,
  paypalOrderId: string,
): Promise<boolean> {
  const captureId = getCompletedCaptureId(paypalOrder, attempt, paypalOrderId);
  if (!captureId) return false;
  return markPayPalAttemptPaid({ attemptId: attempt.id, captureId });
}

function isTerminalCaptureError(error: unknown): error is PayPalApiError {
  return (
    error instanceof PayPalApiError &&
    error.status >= 400 &&
    error.status < 500 &&
    error.status !== 408 &&
    error.status !== 429
  );
}

function retryStatus(attempt: AttemptWithOrder): "pending" | "approved" | "capturing" {
  if (attempt.status === "approved" || attempt.status === "capturing") return attempt.status;
  return "pending";
}

export async function reconcileExpiredPayPalAttempts() {
  const now = new Date();
  const attempts = await findExpiredAttempts(now);
  const summary = {
    scanned: attempts.length,
    paid: 0,
    failed: 0,
    cancelled: 0,
    deferred: 0,
    errors: 0,
  };

  for (const attempt of attempts) {
    if (!(await claimAttempt(attempt, now))) continue;
    try {
      if (attempt.order.status !== "pending") {
        await deferAttempt(attempt, retryStatus(attempt), now);
        continue;
      }

      const paypalOrderId = await loadOrCreatePayPalOrder(attempt);
      const paypalOrder = await getPayPalOrder(paypalOrderId);
      const purchaseUnit = getPayPalPurchaseUnit(paypalOrder, {
        providerOrderId: paypalOrderId,
        orderId: attempt.orderId,
        amountCents: attempt.amountCents,
        currency: attempt.currency,
        order: { providerReference: attempt.order.providerReference },
      });
      if (!purchaseUnit || typeof paypalOrder.status !== "string") {
        throw new Error("PayPal order details do not match the local payment attempt.");
      }

      if (paypalOrder.status === "COMPLETED") {
        if (!(await markCompletedOrderPaid(paypalOrder, attempt, paypalOrderId))) {
          throw new Error("Completed PayPal order has no matching completed capture.");
        }
        summary.paid += 1;
        continue;
      }

      if (["CREATED", "SAVED", "VOIDED"].includes(paypalOrder.status)) {
        const cancelled = await finishPayPalAttemptWithoutPayment({
          attemptId: attempt.id,
          orderId: attempt.orderId,
          attemptStatus: "cancelled",
          orderStatus: "cancelled",
        });
        if (cancelled) summary.cancelled += 1;
        continue;
      }

      if (paypalOrder.status === "APPROVED") {
        try {
          const captureResponse = await capturePayPalOrder(
            paypalOrderId,
            attempt.captureRequestId,
          );
          if (!(await markCompletedOrderPaid(captureResponse, attempt, paypalOrderId))) {
            throw new Error("PayPal capture response has no matching completed capture.");
          }
          summary.paid += 1;
        } catch (error) {
          if (!isTerminalCaptureError(error)) throw error;

          // A rejected retry can mean a prior capture succeeded; verify provider state before release.
          const currentOrder = await getPayPalOrder(paypalOrderId);
          if (currentOrder.status === "COMPLETED") {
            if (!(await markCompletedOrderPaid(currentOrder, attempt, paypalOrderId))) {
              throw new Error("Completed PayPal order has no matching completed capture.");
            }
            summary.paid += 1;
            continue;
          }
          const failed = await finishPayPalAttemptWithoutPayment({
            attemptId: attempt.id,
            orderId: attempt.orderId,
            attemptStatus: "failed",
            orderStatus: "failed",
          });
          if (failed) summary.failed += 1;
        }
        continue;
      }

      await deferAttempt(
        attempt,
        retryStatus(attempt),
        now,
      );
      summary.deferred += 1;
    } catch (error) {
      summary.errors += 1;
      console.error(JSON.stringify({
        event: "paypal_payment_attempt_reconciliation_failed",
        attemptId: attempt.id,
        error: error instanceof Error ? error.message : String(error),
      }));
      await deferAttempt(attempt, retryStatus(attempt), now);
    }
  }

  await prisma.apiRateLimitBucket.deleteMany({
    where: { resetAt: { lt: new Date(now.getTime() - 24 * 60 * 60 * 1000) } },
  });
  return summary;
}
