import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import {
  finishPayPalAttemptWithoutPayment,
  markPayPalAttemptApproved,
  markPayPalAttemptPaid,
  markPayPalAttemptRefunded,
} from "@/lib/checkout/payment-state";
import {
  getCaptureOrderId,
  getPayPalCapture,
  getPayPalPurchaseUnit,
  paypalAmountToCents,
  validatePayPalCapture,
} from "@/lib/checkout/paypal-order-validation";
import {
  applyRateLimit,
  rateLimitResponse,
  readJsonBody,
  RequestBodyError,
} from "@/lib/request-security";
import {
  getPayPalCapture as fetchPayPalCapture,
  getPayPalOrder,
  toPayPalAmount,
  verifyPayPalWebhook,
} from "@/lib/paypal";

type JsonObject = Record<string, unknown>;

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function findAttempt(paypalOrderId: string) {
  const attempt = await prisma.paymentAttempt.findUnique({
    where: { providerOrderId: paypalOrderId },
    include: { order: true },
  });
  if (!attempt || attempt.provider !== "PAYPAL") {
    throw new Error("PayPal event does not match a local payment attempt.");
  }
  return attempt;
}

function getVerifiedPurchaseUnit(order: JsonObject, attempt: Awaited<ReturnType<typeof findAttempt>>) {
  const unit = getPayPalPurchaseUnit(order, {
    providerOrderId: attempt.providerOrderId,
    orderId: attempt.orderId,
    amountCents: attempt.amountCents,
    currency: attempt.currency,
    order: { providerReference: attempt.order.providerReference },
  });
  if (!unit) throw new Error("PayPal order does not match the local payment attempt.");
  return unit;
}

async function processApprovedOrder(resource: JsonObject) {
  const paypalOrderId = resource.id;
  if (typeof paypalOrderId !== "string" || !paypalOrderId) {
    throw new Error("PayPal approval event does not include an order ID.");
  }
  const attempt = await findAttempt(paypalOrderId);
  const providerOrder = await getPayPalOrder(paypalOrderId);
  if (providerOrder.status !== "APPROVED") {
    throw new Error("PayPal order is not currently approved.");
  }
  getVerifiedPurchaseUnit(providerOrder, attempt);
  await markPayPalAttemptApproved(attempt.id);
}

async function processVoidedOrder(resource: JsonObject) {
  const paypalOrderId = resource.id;
  if (typeof paypalOrderId !== "string" || !paypalOrderId) {
    throw new Error("PayPal void event does not include an order ID.");
  }
  const attempt = await findAttempt(paypalOrderId);
  const providerOrder = await getPayPalOrder(paypalOrderId);
  if (providerOrder.status !== "VOIDED") {
    throw new Error("PayPal order is not currently voided.");
  }
  getVerifiedPurchaseUnit(providerOrder, attempt);
  await finishPayPalAttemptWithoutPayment({
    attemptId: attempt.id,
    orderId: attempt.orderId,
    attemptStatus: "cancelled",
    orderStatus: "cancelled",
  });
}

async function processCaptureEvent(eventType: string, resource: JsonObject) {
  const paypalOrderId = getCaptureOrderId(resource);
  const relatedIds =
    isObject(resource.supplementary_data) &&
    isObject(resource.supplementary_data.related_ids)
      ? resource.supplementary_data.related_ids
      : null;
  const captureId =
    typeof relatedIds?.capture_id === "string"
      ? relatedIds.capture_id
      : typeof resource.id === "string"
        ? resource.id
        : null;
  if (!paypalOrderId || !captureId) {
    throw new Error("PayPal capture event is missing its order or capture ID.");
  }

  const attempt = await findAttempt(paypalOrderId);
  const providerOrder = await getPayPalOrder(paypalOrderId);
  const unit = getVerifiedPurchaseUnit(providerOrder, attempt);
  const freshCapture = await fetchPayPalCapture(captureId);
  const freshOrderId = getCaptureOrderId(freshCapture);
  if (freshOrderId && freshOrderId !== paypalOrderId) {
    throw new Error("PayPal capture belongs to a different provider order.");
  }

  if (eventType === "PAYMENT.CAPTURE.COMPLETED") {
    if (
      providerOrder.status !== "COMPLETED" ||
      !getPayPalCapture(
        providerOrder,
        unit,
        captureId,
        "COMPLETED",
        attempt.amountCents,
        attempt.currency,
      ) ||
      !validatePayPalCapture(
        freshCapture,
        captureId,
        ["COMPLETED"],
        attempt.amountCents,
        attempt.currency,
      ) ||
      !isObject(resource.amount) ||
      resource.amount.value !== toPayPalAmount(attempt.amountCents) ||
      resource.amount.currency_code !== attempt.currency
    ) {
      throw new Error("PayPal completed capture does not match the local order.");
    }
    const paid = await markPayPalAttemptPaid({ attemptId: attempt.id, captureId });
    if (!paid) throw new Error("Local state does not allow the completed PayPal capture.");
    return;
  }

  if (eventType === "PAYMENT.CAPTURE.DENIED") {
    if (
      !validatePayPalCapture(
        freshCapture,
        captureId,
        ["DENIED"],
        attempt.amountCents,
        attempt.currency,
      ) ||
      (isObject(resource.amount) &&
        (resource.amount.value !== toPayPalAmount(attempt.amountCents) ||
          resource.amount.currency_code !== attempt.currency))
    ) {
      throw new Error("PayPal denied capture does not match the local order.");
    }
    await finishPayPalAttemptWithoutPayment({
      attemptId: attempt.id,
      orderId: attempt.orderId,
      attemptStatus: "failed",
      orderStatus: "failed",
    });
    return;
  }

  if (
    !validatePayPalCapture(
      freshCapture,
      captureId,
      ["REFUNDED", "PARTIALLY_REFUNDED"],
      attempt.amountCents,
      attempt.currency,
    )
  ) {
    throw new Error("PayPal refund does not match the local capture.");
  }
  const breakdown = isObject(freshCapture.seller_receivable_breakdown)
    ? freshCapture.seller_receivable_breakdown
    : null;
  const totalRefunded = isObject(breakdown?.total_refunded_amount)
    ? paypalAmountToCents(breakdown.total_refunded_amount.value)
    : freshCapture.status === "REFUNDED"
      ? attempt.amountCents
      : null;
  if (
    totalRefunded === null ||
    totalRefunded < 1 ||
    totalRefunded > attempt.amountCents
  ) {
    throw new Error("PayPal refund total is missing or does not match the capture amount.");
  }
  const refunded = await markPayPalAttemptRefunded({
    attemptId: attempt.id,
    captureId,
    refundedAmountCents: totalRefunded,
  });
  if (!refunded) throw new Error("Local state does not allow this PayPal refund transition.");
}

export async function POST(request: Request) {
  const limit = await applyRateLimit(request, "paypal-webhook", 300, 5 * 60);
  if (!limit.allowed) return rateLimitResponse(limit.retryAfterSeconds);

  let event: unknown;
  try {
    event = await readJsonBody(request, 256 * 1024);
  } catch (error) {
    if (error instanceof RequestBodyError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }
  if (
    !isObject(event) ||
    typeof event.id !== "string" ||
    event.id.length > 256 ||
    typeof event.event_type !== "string" ||
    event.event_type.length > 128
  ) {
    return Response.json({ error: "Webhook event is invalid." }, { status: 400 });
  }

  try {
    if (!(await verifyPayPalWebhook({ headers: request.headers, webhookEvent: event }))) {
      return Response.json({ error: "PayPal webhook signature is invalid." }, { status: 400 });
    }
  } catch (error) {
    console.error("Unable to verify PayPal webhook signature.", error);
    return Response.json({ error: "Unable to verify PayPal webhook." }, { status: 503 });
  }

  let webhook = await prisma.paymentWebhookEvent.findUnique({
    where: {
      provider_providerEventId: { provider: "PAYPAL", providerEventId: event.id },
    },
  });
  if (webhook?.status === "processed") {
    return Response.json({ received: true, duplicate: true });
  }

  if (!webhook) {
    try {
      webhook = await prisma.paymentWebhookEvent.create({
        data: {
          provider: "PAYPAL",
          providerEventId: event.id,
          eventType: event.event_type,
          payloadHash: createHash("sha256").update(JSON.stringify(event)).digest("hex"),
        },
      });
    } catch (error) {
      if (
        !error ||
        typeof error !== "object" ||
        !("code" in error) ||
        error.code !== "P2002"
      ) {
        throw error;
      }
      webhook = await prisma.paymentWebhookEvent.findUnique({
        where: {
          provider_providerEventId: { provider: "PAYPAL", providerEventId: event.id },
        },
      });
      if (webhook?.status === "processed") {
        return Response.json({ received: true, duplicate: true });
      }
      if (!webhook) throw new Error("Unable to load duplicate PayPal webhook event.");
    }
  }

  try {
    const resource = isObject(event.resource) ? event.resource : null;
    switch (event.event_type) {
      case "CHECKOUT.ORDER.APPROVED":
        if (!resource) throw new Error("PayPal approval event has no resource.");
        await processApprovedOrder(resource);
        break;
      case "CHECKOUT.ORDER.VOIDED":
        if (!resource) throw new Error("PayPal void event has no resource.");
        await processVoidedOrder(resource);
        break;
      case "PAYMENT.CAPTURE.COMPLETED":
      case "PAYMENT.CAPTURE.DENIED":
      case "PAYMENT.CAPTURE.REFUNDED":
        if (!resource) throw new Error("PayPal capture event has no resource.");
        await processCaptureEvent(event.event_type, resource);
        break;
      default:
        break;
    }

    await prisma.paymentWebhookEvent.update({
      where: { id: webhook.id },
      data: { status: "processed", processedAt: new Date() },
    });
    return Response.json({ received: true });
  } catch (error) {
    await prisma.paymentWebhookEvent.update({
      where: { id: webhook.id },
      data: { status: "failed" },
    });
    console.error("Unable to process PayPal webhook.", {
      eventId: event.id,
      eventType: event.event_type,
      error,
    });
    return Response.json({ error: "Unable to process PayPal webhook." }, { status: 500 });
  }
}
