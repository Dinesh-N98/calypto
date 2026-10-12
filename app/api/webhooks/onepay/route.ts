import { prisma } from "@/lib/prisma";
import { refreshOnePayOrderStatus } from "@/lib/onepay";
import {
  applyRateLimit,
  rateLimitResponse,
  readJsonBody,
  RequestBodyError,
} from "@/lib/request-security";

export async function POST(request: Request) {
  const limit = await applyRateLimit(request, "onepay-webhook", 300, 5 * 60);
  if (!limit.allowed) return rateLimitResponse(limit.retryAfterSeconds);

  let body: unknown;
  try {
    body = await readJsonBody(request, 16 * 1024);
  } catch (error) {
    if (error instanceof RequestBodyError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }
  const transactionId =
    body && typeof body === "object" && "transaction_id" in body ? body.transaction_id : null;
  if (typeof transactionId !== "string" || !transactionId || transactionId.length > 200) {
    return Response.json({ error: "Missing OnePay transaction ID." }, { status: 400 });
  }

  const order = await prisma.order.findFirst({
    where: { paymentProvider: "ONEPAY", providerTransactionId: transactionId },
    select: {
      id: true,
      providerTransactionId: true,
      totalCents: true,
      currency: true,
      status: true,
    },
  });
  if (!order) return Response.json({ error: "Order not found." }, { status: 404 });
  // OnePay's documented callback has no signature field, so treat it only as a trigger.
  // Ignore repeats or late callbacks once the order has left PENDING.
  if (order.status !== "pending") {
    return Response.json({ received: true, status: order.status }, { status: 200 });
  }

  try {
    // Authenticate the payment server-to-server with our App Token and verify transaction ID,
    // amount, and currency before changing order status; never trust the callback's status field.
    const status = await refreshOnePayOrderStatus(order);
    return Response.json({ received: true, status }, { status: 200 });
  } catch (error) {
    console.error("Unable to verify OnePay callback.", error);
    return Response.json({ error: "Unable to verify OnePay transaction." }, { status: 502 });
  }
}
