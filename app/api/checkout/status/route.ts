import { prisma } from "@/lib/prisma";
import { refreshOnePayOrderStatus } from "@/lib/onepay";

export async function GET(request: Request) {
  const reference = new URL(request.url).searchParams.get("reference");
  if (!reference) {
    return Response.json({ error: "Missing order reference." }, { status: 400 });
  }

  const order = await prisma.order.findFirst({
    where: { paymentProvider: "ONEPAY", providerReference: reference },
    select: {
      id: true,
      providerTransactionId: true,
      totalCents: true,
      currency: true,
      status: true,
    },
  });
  if (!order) return Response.json({ error: "Order not found." }, { status: 404 });

  try {
    const status = await refreshOnePayOrderStatus(order);
    return Response.json({ status });
  } catch (error) {
    console.error("Unable to refresh OnePay order status.", error);
    return Response.json({ error: "Unable to verify payment status right now." }, { status: 502 });
  }
}
