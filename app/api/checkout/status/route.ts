import { prisma } from "@/lib/prisma";
import { refreshOnePayOrderStatus } from "@/lib/onepay";

export async function GET(request: Request) {
  const reference = new URL(request.url).searchParams.get("reference");
  if (!reference) {
    return Response.json({ error: "Missing order reference." }, { status: 400 });
  }

  const order = await prisma.order.findFirst({
    where: { providerReference: reference },
    select: {
      id: true,
      paymentProvider: true,
      providerTransactionId: true,
      totalCents: true,
      currency: true,
      status: true,
    },
  });
  if (!order) return Response.json({ error: "Order not found." }, { status: 404 });

  if (order.paymentProvider === "PAYPAL") {
    return Response.json({ status: order.status }, { headers: { "Cache-Control": "no-store" } });
  }
  if (order.paymentProvider !== "ONEPAY") {
    return Response.json({ status: order.status }, { headers: { "Cache-Control": "no-store" } });
  }

  try {
    const status = await refreshOnePayOrderStatus(order);
    return Response.json({ status });
  } catch (error) {
    console.error("Unable to refresh OnePay order status.", error);
    return Response.json({ error: "Unable to verify payment status right now." }, { status: 502 });
  }
}
