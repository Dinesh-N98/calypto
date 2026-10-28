import { NextResponse } from "next/server";
import { requireAdminRequest } from "@/lib/admin";
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
      select: {
        id: true,
        providerReference: true,
        email: true,
        customerFirstName: true,
        customerLastName: true,
        customerPhone: true,
        user: { select: { name: true } },
        status: true,
        fulfillmentStatus: true,
        paymentProvider: true,
        carrier: true,
        trackingNumber: true,
        trackingUrl: true,
        dhlTrackingNumber: true,
        dhlShipmentIdentificationNumber: true,
        shippingLabelUrl: true,
        commercialInvoiceUrl: true,
        shippingName: true,
        shippingLine1: true,
        shippingLine2: true,
        shippingCity: true,
        shippingState: true,
        shippingPostalCode: true,
        shippingCountry: true,
        createdAt: true,
        totalCents: true,
        currency: true,
        items: {
          orderBy: { id: "asc" },
          select: { id: true, name: true, quantity: true, priceCents: true, sku: true },
        },
      },
    });
    if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });

    return NextResponse.json(
      { order },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    console.error("Unable to load admin order details.", error);
    return NextResponse.json({ error: "Unable to load order details." }, { status: 500 });
  }
}
