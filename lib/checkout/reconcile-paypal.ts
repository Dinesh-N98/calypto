import { prisma } from "@/lib/prisma";
import {
  finishPayPalAttemptWithoutPayment,
  markPayPalAttemptPaid,
} from "@/lib/checkout/payment-state";
import {
  getPayPalCapture,
  getPayPalPurchaseUnit,
} from "@/lib/checkout/paypal-order-validation";
import { createPayPalOrder, getPayPalOrder } from "@/lib/paypal";

const RECONCILE_BATCH_SIZE = 5;
const CAPTURE_STALE_GRACE_MS = 2 * 60 * 1000;
const RETRY_DELAY_MS = 15 * 60 * 1000;

type AttemptWithOrder = NonNullable<
  Awaited<ReturnType<typeof findExpiredAttempts>>
>[number];

async function findExpiredAttempts(now: Date) {
  return prisma.paymentAttempt.findMany({
    where: {
      provider: "PAYPAL",
      expiresAt: { lte: now },
      OR: [
        { status: { in: ["pending", "approved"] } },
        {
          status: "capturing",
          updatedAt: { lte: new Date(now.getTime() - CAPTURE_STALE_GRACE_MS) },
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
  const where =
    attempt.status === "capturing"
      ? {
          id: attempt.id,
          status: "capturing",
          expiresAt: { lte: now },
          updatedAt: { lte: new Date(now.getTime() - CAPTURE_STALE_GRACE_MS) },
        }
      : {
          id: attempt.id,
          status: attempt.status,
          expiresAt: { lte: now },
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
        await deferAttempt(attempt, attempt.status as "pending" | "approved" | "capturing", now);
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
        const captures =
          purchaseUnit.payments &&
          typeof purchaseUnit.payments === "object" &&
          "captures" in purchaseUnit.payments &&
          Array.isArray(purchaseUnit.payments.captures)
            ? purchaseUnit.payments.captures
            : [];
        const completedCapture = captures.find(
          (capture): capture is Record<string, unknown> =>
            !!capture &&
            typeof capture === "object" &&
            "id" in capture &&
            typeof capture.id === "string" &&
            getPayPalCapture(
              purchaseUnit,
              capture.id,
              "COMPLETED",
              attempt.amountCents,
              attempt.currency,
            ) !== null,
        );
        if (!completedCapture || typeof completedCapture.id !== "string") {
          throw new Error("Completed PayPal order has no matching completed capture.");
        }
        const paid = await markPayPalAttemptPaid({
          attemptId: attempt.id,
          captureId: completedCapture.id,
        });
        if (!paid) throw new Error("Local state did not allow the PayPal paid transition.");
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
        await deferAttempt(attempt, "approved", now);
        summary.deferred += 1;
        continue;
      }

      await deferAttempt(
        attempt,
        attempt.status === "capturing" ? "capturing" : "pending",
        now,
      );
      summary.deferred += 1;
    } catch (error) {
      summary.errors += 1;
      console.error("Unable to reconcile an expired PayPal payment attempt.", {
        attemptId: attempt.id,
        error,
      });
      await deferAttempt(
        attempt,
        attempt.status === "capturing" ? "capturing" : attempt.status as "pending" | "approved",
        now,
      );
    }
  }

  await prisma.apiRateLimitBucket.deleteMany({
    where: { resetAt: { lt: new Date(now.getTime() - 24 * 60 * 60 * 1000) } },
  });
  return summary;
}
