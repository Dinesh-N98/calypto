import { createHash } from "node:crypto";
import { auth } from "@/auth";
import {
  CheckoutInputError,
  createPendingCheckoutOrder,
  InsufficientStockError,
  parseCheckoutPayload,
  releaseOrderInventory,
} from "@/lib/checkout/order";
import { prisma } from "@/lib/prisma";
import {
  applyRateLimit,
  rateLimitResponse,
  readJsonBody,
  RequestBodyError,
} from "@/lib/request-security";
import {
  assertPayPalConfigured,
  createPayPalOrder,
  PayPalApiError,
} from "@/lib/paypal";

function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  return origin === new URL(request.url).origin;
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return Response.json({ error: "Cross-origin checkout is not allowed." }, { status: 403 });
  }

  const limit = await applyRateLimit(request, "paypal-order-create", 12, 10 * 60);
  if (!limit.allowed) return rateLimitResponse(limit);

  const idempotencyKey = request.headers.get("idempotency-key");
  if (
    !idempotencyKey ||
    idempotencyKey.length > 38 ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      idempotencyKey,
    )
  ) {
    return Response.json({ error: "A valid checkout idempotency key is required." }, { status: 400 });
  }

  let payload: ReturnType<typeof parseCheckoutPayload>;
  try {
    payload = parseCheckoutPayload(await readJsonBody(request, 16 * 1024));
  } catch (error) {
    if (error instanceof RequestBodyError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof CheckoutInputError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }

  if (!/^[A-Za-z]{2}$/u.test(payload.address.country)) {
    return Response.json(
      { error: "For PayPal, enter the two-letter ISO country code (for example, LK)." },
      { status: 400 },
    );
  }

  try {
    assertPayPalConfigured();
  } catch (error) {
    console.error("PayPal checkout is not configured.", error);
    return Response.json({ error: "PayPal checkout is not configured." }, { status: 503 });
  }

  const session = await auth();
  const requestHash = createHash("sha256").update(JSON.stringify(payload)).digest("hex");
  let attempt = await prisma.paymentAttempt.findUnique({
    where: { idempotencyKey },
    include: { order: true },
  });
  if (attempt) {
    if (
      attempt.provider !== "PAYPAL" ||
      attempt.order.userId !== (session?.user?.id ?? null) ||
      !["pending", "approved", "capturing", "paid"].includes(attempt.status) ||
      attempt.requestHash !== requestHash
    ) {
      return Response.json({ error: "This checkout attempt cannot be reused." }, { status: 409 });
    }
    if (attempt.providerOrderId) {
      return Response.json({ id: attempt.providerOrderId });
    }
  } else {
    try {
      const order = await createPendingCheckoutOrder({
        payload,
        provider: "PAYPAL",
        idempotencyKey,
      });
      attempt = await prisma.paymentAttempt.findUnique({
        where: { idempotencyKey },
        include: { order: true },
      });
      if (!attempt || attempt.orderId !== order.id) {
        throw new Error("Unable to load the PayPal payment attempt.");
      }
    } catch (error) {
      if (error instanceof InsufficientStockError) {
        return Response.json(
          { error: "One or more variants no longer have enough stock. Update your cart and try again." },
          { status: 409 },
        );
      }
      if (error instanceof CheckoutInputError) {
        return Response.json({ error: error.message }, { status: error.status });
      }
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "P2002"
      ) {
        attempt = await prisma.paymentAttempt.findUnique({
          where: { idempotencyKey },
          include: { order: true },
        });
      } else {
        throw error;
      }
    }
  }

  if (
    !attempt ||
    attempt.order.userId !== (session?.user?.id ?? null) ||
    attempt.requestHash !== requestHash
  ) {
    return Response.json({ error: "Unable to initialize PayPal checkout." }, { status: 500 });
  }
  if (attempt.providerOrderId) return Response.json({ id: attempt.providerOrderId });

  try {
    const paypalOrder = await createPayPalOrder({
      reference: attempt.order.providerReference,
      orderId: attempt.orderId,
      amountCents: attempt.amountCents,
      currency: attempt.currency,
      requestId: idempotencyKey,
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
    if (typeof paypalOrder.id !== "string" || !paypalOrder.id || paypalOrder.id.length > 64) {
      throw new Error("PayPal did not return a valid order ID.");
    }
    await prisma.paymentAttempt.updateMany({
      where: { id: attempt.id, status: "pending", providerOrderId: null },
      data: { providerOrderId: paypalOrder.id },
    });
    const savedAttempt = await prisma.paymentAttempt.findUnique({
      where: { id: attempt.id },
      select: { providerOrderId: true },
    });
    if (savedAttempt?.providerOrderId !== paypalOrder.id) {
      throw new Error("PayPal order ID could not be associated with the local attempt.");
    }
    return Response.json({ id: paypalOrder.id });
  } catch (error) {
    if (error instanceof PayPalApiError && error.status >= 400 && error.status < 500) {
      await prisma.paymentAttempt.updateMany({
        where: { id: attempt.id, status: "pending" },
        data: { status: "failed" },
      });
      await releaseOrderInventory(attempt.orderId, "pending", "failed");
    }
    console.error("Unable to create PayPal order.", error);
    return Response.json(
      { error: "Unable to start PayPal checkout. Please try again or choose OnePay." },
      { status: 502 },
    );
  }
}
