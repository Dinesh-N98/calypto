import { NextResponse } from "next/server";
import { requireAdminRequest } from "@/lib/admin";
import { createOrderInvoiceResponse } from "@/lib/order-invoice";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ orderId: string }> },
) {
  const authorization = await requireAdminRequest();
  if (!authorization.ok) return authorization.response;

  const { orderId } = await params;
  if (!orderId || orderId.length > 191) {
    return NextResponse.json({ error: "Order ID is invalid." }, { status: 400 });
  }

  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: { orderBy: { id: "asc" } } },
    });
    if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });

    return createOrderInvoiceResponse(order);
  } catch (error) {
    console.error("Unable to generate admin order invoice.", error);
    return NextResponse.json({ error: "Unable to generate the invoice." }, { status: 500 });
  }
}
