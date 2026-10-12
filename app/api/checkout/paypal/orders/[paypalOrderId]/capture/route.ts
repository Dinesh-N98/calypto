import { auth } from "@/auth";
import { markPayPalAttemptPaid } from "@/lib/checkout/payment-state";
import { prisma } from "@/lib/prisma";
import {
  capturePayPalOrder,
  getPayPalOrder,
  PayPalApiError,
  toPayPalAmount,
} from "@/lib/paypal";
import {
  applyRateLimit,
  rateLimitResponse,
  withRateLimitHeaders,
} from "@/lib/request-security";

type CompletedCapture = {
  orderId: string;
  purchaseUnit: Record<string, unknown>;
  capture: { id: string; amount: Record<string, unknown> };
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  return origin === new URL(request.url).origin;
}

function getCompletedCapture(value: Record<string, unknown>): CompletedCapture | null {
  if (typeof value.id !== "string" || !Array.isArray(value.purchase_units)) return null;
  for (const purchaseUnit of value.purchase_units) {
    if (!isObject(purchaseUnit) || !isObject(purchaseUnit.payments)) continue;
    const captures = purchaseUnit.payments.captures;
    if (!Array.isArray(captures)) continue;
    for (const capture of captures) {
      if (
        isObject(capture) &&
        capture.status === "COMPLETED" &&
        typeof capture.id === "string" &&
        capture.id &&
        isObject(capture.amount)
      ) {
        return {
          orderId: value.id,
          purchaseUnit,
          capture: { id: capture.id, amount: capture.amount },
        };
      }
    }
  }
  return null;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ paypalOrderId: string }> },
) {
  if (!isSameOrigin(request)) {
    return Response.json({ error: "Cross-origin capture is not allowed." }, { status: 403 });
  }
  const limit = await applyRateLimit(request, "paypal-capture", 30, 5 * 60);
  if (!limit.allowed) return rateLimitResponse(limit);
  const respond = (response: Response) => withRateLimitHeaders(response, limit);

  const { paypalOrderId } = await params;
  if (!paypalOrderId || paypalOrderId.length > 64) {
    return respond(Response.json({ error: "PayPal order ID is invalid." }, { status: 400 }));
  }

  const attempt = await prisma.paymentAttempt.findUnique({
    where: { providerOrderId: paypalOrderId },
    include: { order: true },
  });
  if (!attempt || attempt.provider !== "PAYPAL") {
    return respond(Response.json({ error: "PayPal checkout attempt not found." }, { status: 404 }));
  }

  const session = await auth();
  if (attempt.order.userId && attempt.order.userId !== session?.user?.id) {
    return respond(Response.json({ error: "You cannot capture this order." }, { status: 403 }));
  }
  if (attempt.status === "paid" && attempt.providerCaptureId) {
    return respond(Response.json({
      status: "paid",
      orderReference: attempt.order.providerReference,
      captureId: attempt.providerCaptureId,
    }));
  }
  if (attempt.status === "capturing") {
    return respond(Response.json(
      { status: "pending", orderReference: attempt.order.providerReference },
      { status: 202, headers: { "Cache-Control": "no-store", "Retry-After": "5" } },
    ));
  }
  if (
    !["pending", "approved"].includes(attempt.status) ||
    attempt.order.status !== "pending" ||
    !attempt.expiresAt ||
    attempt.expiresAt <= new Date()
  ) {
    return respond(Response.json({ error: "This PayPal payment is no longer pending." }, { status: 409 }));
  }

  try {
    const claimed = await prisma.paymentAttempt.updateMany({
      where: {
        id: attempt.id,
        provider: "PAYPAL",
        status: { in: ["pending", "approved"] },
        expiresAt: { gt: new Date() },
      },
      data: { status: "capturing" },
    });
    if (claimed.count !== 1) {
      const current = await prisma.paymentAttempt.findUnique({
        where: { id: attempt.id },
        select: { status: true, providerCaptureId: true },
      });
      if (current?.status === "paid" && current.providerCaptureId) {
        return respond(Response.json({
          status: "paid",
          orderReference: attempt.order.providerReference,
          captureId: current.providerCaptureId,
        }));
      }
      if (current?.status === "capturing" || current?.status === "reconciling") {
        return respond(Response.json(
          { status: "pending", orderReference: attempt.order.providerReference },
          { status: 202, headers: { "Cache-Control": "no-store", "Retry-After": "5" } },
        ));
      }
      return respond(Response.json({ error: "This PayPal payment is no longer pending." }, { status: 409 }));
    }

    const result = await capturePayPalOrder(paypalOrderId, attempt.captureRequestId);
    const completed = getCompletedCapture(result);
    if (
      !completed ||
      completed.orderId !== attempt.providerOrderId ||
      completed.purchaseUnit.custom_id !== attempt.orderId ||
      completed.purchaseUnit.invoice_id !== attempt.order.providerReference
    ) {
      throw new Error("PayPal capture response does not match the pending order.");
    }
    const amount = completed.capture.amount;
    if (
      amount.value !== toPayPalAmount(attempt.amountCents) ||
      amount.currency_code !== attempt.currency
    ) {
      throw new Error("PayPal capture amount or currency does not match the pending order.");
    }

    const paid = await markPayPalAttemptPaid({
      attemptId: attempt.id,
      captureId: completed.capture.id,
    });
    if (!paid) throw new Error("Order state changed before PayPal capture could be recorded.");

    return respond(Response.json({
      status: "paid",
      orderReference: attempt.order.providerReference,
      captureId: completed.capture.id,
    }));
  } catch (error) {
    if (error instanceof PayPalApiError && error.status === 422) {
      // PayPal may already have completed an earlier capture. Reconcile before reporting failure.
      try {
        const currentOrder = await getPayPalOrder(paypalOrderId);
        const completed = getCompletedCapture(currentOrder);
        if (completed) {
          return respond(Response.json(
            { error: "PayPal reports a completed capture; payment reconciliation is required." },
            { status: 409 },
          ));
        }
      } catch (reconciliationError) {
        console.error("Unable to reconcile repeated PayPal capture.", reconciliationError);
      }
    }
    console.error("Unable to capture PayPal order.", error);
    return respond(Response.json(
      { error: "Unable to confirm PayPal payment. Your order will remain pending while it is verified." },
      { status: error instanceof PayPalApiError ? 502 : 409 },
    ));
  }
}
