import { getDhlConfig } from "@/lib/config/dhl";
import { requestDhlPickup } from "@/lib/dhl/pickup";
import { requireAdminRequest } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

type RouteContext = { params: Promise<{ id: string }> };

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
  const { id } = await params;
  if (!id || id.length > 191) return NextResponse.json({ error: "Order ID is invalid." }, { status: 400 });

  try {
    const config = getDhlConfig();
    if (!config.shipperPhone || !config.shipperEmail) {
      return NextResponse.json(
        { error: "DHL_SHIPPER_PHONE and DHL_SHIPPER_EMAIL must be configured." },
        { status: 503 },
      );
    }
    const order = await prisma.order.findUnique({
      where: { id },
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
      pickupLocation: config.shipperCity,
      specialInstruction: process.env.DHL_PICKUP_INSTRUCTION?.trim(),
      shipper: {
        personName: "Calypto Bait",
        companyName: "Calypto Bait",
        phoneNumber: config.shipperPhone,
        emailAddress: config.shipperEmail,
        streetLines: process.env.DHL_SHIPPER_ADDRESS?.trim() || "Calypto Bait",
        city: config.shipperCity,
        postalCode: process.env.DHL_SHIPPER_POSTAL_CODE?.trim() || "00200",
        countryCode: config.shipperCountry,
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
      where: { id },
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
