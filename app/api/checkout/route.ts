import {
  CheckoutInputError,
  createPendingCheckoutOrder,
  parseCheckoutPayload,
  releaseOrderInventory,
  InsufficientStockError,
} from "@/lib/checkout/order";
import { prisma } from "@/lib/prisma";
import type { CheckoutPayload } from "@/lib/checkout/types";
import {
  applyRateLimit,
  rateLimitResponse,
  readJsonBody,
  RequestBodyError,
} from "@/lib/request-security";
import {
  assertOnePayConfigured,
  createOnePayCheckout,
  OnePayApiError,
} from "@/lib/onepay";

function getAppBaseUrl(): string | null {
  const value = process.env.APP_BASE_URL;
  if (!value) return null;
  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.pathname !== "/" ||
      url.search ||
      url.hash
    ) {
      return null;
    }
    return url.origin;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin !== new URL(request.url).origin) {
    return Response.json({ error: "Cross-origin checkout is not allowed." }, { status: 403 });
  }
  const limit = await applyRateLimit(request, "onepay-checkout", 12, 10 * 60);
  if (!limit.allowed) return rateLimitResponse(limit);

  let payload: CheckoutPayload;
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

  const appBaseUrl = getAppBaseUrl();
  if (!appBaseUrl) {
    return Response.json({ error: "APP_BASE_URL must be a public HTTPS origin." }, { status: 500 });
  }
  try {
    assertOnePayConfigured();
  } catch {
    return Response.json({ error: "OnePay credentials are not configured." }, { status: 500 });
  }

  let order: Awaited<ReturnType<typeof createPendingCheckoutOrder>>;
  try {
    order = await createPendingCheckoutOrder({ payload, provider: "ONEPAY" });
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
    throw error;
  }

  try {
    const checkout = await createOnePayCheckout({
      appBaseUrl,
      amountCents: order.totalCents,
      customer: order.customer,
      reference: order.providerReference,
    });
    await prisma.order.update({
      where: { id: order.id },
      data: { providerTransactionId: checkout.transactionId },
    });
    if (typeof checkout.redirectUrl !== "string") {
      throw new Error("OnePay did not return the documented checkout URL.");
    }
    const redirectUrl = new URL(checkout.redirectUrl);
    if (redirectUrl.protocol !== "https:") {
      throw new Error("OnePay returned a non-HTTPS checkout URL.");
    }
    return Response.json({ url: redirectUrl.toString() });
  } catch (error) {
    if (error instanceof OnePayApiError && error.status >= 400 && error.status < 500) {
      await releaseOrderInventory(order.id, "pending", "failed");
    }
    console.error("Unable to start OnePay checkout.", error);
    return Response.json(
      {
        error:
          error instanceof OnePayApiError && error.status >= 400 && error.status < 500
            ? "OnePay rejected the checkout request. Please review your details and try again."
            : `Checkout could not be confirmed. Keep reference ${order.providerReference} and contact support if you were charged.`,
      },
      { status: 502 },
    );
  }
}
