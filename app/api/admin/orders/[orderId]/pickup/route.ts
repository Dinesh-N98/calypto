import { getDhlConfig } from "@/lib/config/dhl";
import { requestDhlPickup } from "@/lib/dhl/pickup";
import { requireAdminRequest } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

type RouteContext = { params: Promise<{ orderId: string }> };

function nextBusinessDay(): Date {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  while ([0, 6].includes(date.getDay())) date.setDate(date.getDate() + 1);
  date.setHours(13, 0, 0, 0);
  return date;
}

export async function POST(request: Request, { params }: RouteContext) {
  const authorization = await requireAdminRequest();
  if (!authorization.ok) return authorization.response;
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: "Cross-origin updates are not allowed." }, { status: 403 });
  }
  const { orderId } = await params;
  if (!orderId || orderId.length > 191) return NextResponse.json({ error: "Order ID is invalid." }, { status: 400 });

  try {
    const config = getDhlConfig();
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: { orderBy: { id: "asc" } } },
    });
    if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });
    if (!order.dhlTrackingNumber) {
      return NextResponse.json({ error: "Generate a DHL shipment before scheduling pickup." }, { status: 409 });
    }
    if (order.dhlPickupConfirmationNumber) {
      return NextResponse.json({
        confirmationNumber: order.dhlPickupConfirmationNumber,
        alreadyScheduled: true,
      });
    }

    const pickup = await requestDhlPickup({
      pickupTimestamp: nextBusinessDay(),
      pickupLocationCloseTime: process.env.DHL_PICKUP_CLOSE_TIME?.trim() || "16:30",
      pickupLocation: config.shipper.city,
      specialInstruction: process.env.DHL_PICKUP_INSTRUCTION?.trim(),
      shipper: {
        personName: "Calypto Bait",
        companyName: "Calypto Bait",
        phoneNumber: config.shipper.phoneNumber,
        emailAddress: config.shipper.emailAddress,
        streetLines: config.shipper.streetLines,
        city: config.shipper.city,
        postalCode: config.shipper.postalCode,
        countryCode: config.shipper.countryCode,
      },
      packages: [{
        weightKg: Number(process.env.DHL_DEFAULT_PACKAGE_WEIGHT_KG ?? "0.5") *
          Math.max(order.items.reduce((sum, item) => sum + item.quantity, 0), 1),
        lengthCm: config.defaultPackage.lengthCm,
        widthCm: config.defaultPackage.widthCm,
        heightCm: config.defaultPackage.heightCm,
        customerReference: order.providerReference,
      }],
    });
    await prisma.order.update({
      where: { id: orderId },
      data: {
        dhlPickupConfirmationNumber: pickup.confirmationNumber,
        dhlPickupRawResponse: JSON.parse(JSON.stringify(pickup.rawResponse)),
      },
    });
    return NextResponse.json({
      confirmationNumber: pickup.confirmationNumber,
      alreadyScheduled: false,
    }, { status: 201 });
  } catch (error) {
    console.error("Unable to schedule DHL pickup.", error);
    return NextResponse.json({ error: "Unable to schedule the DHL pickup." }, { status: 502 });
  }
}
