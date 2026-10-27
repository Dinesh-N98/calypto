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
      providerReference: true,
      totalCents: true,
      currency: true,
      status: true,
      items: {
        select: {
          sku: true,
          productSlug: true,
          variantId: true,
          name: true,
          priceCents: true,
          quantity: true,
        },
      },
    },
  });
  if (!order) return Response.json({ error: "Order not found." }, { status: 404 });

  let status = order.status;
  try {
    if (order.paymentProvider === "ONEPAY") {
      status = await refreshOnePayOrderStatus(order);
    }
  } catch (error) {
    console.error("Unable to refresh OnePay order status.", error);
    return Response.json({ error: "Unable to verify payment status right now." }, { status: 502 });
  }

  if (status !== "paid") {
    return Response.json({ status }, { headers: { "Cache-Control": "no-store" } });
  }

  return Response.json(
    {
      status,
      purchase: {
        transactionId: order.providerReference,
        totalCents: order.totalCents,
        currency: order.currency,
        items: order.items,
      },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
