import { getDhlConfig } from "@/lib/config/dhl";
import { createDhlShipment } from "@/lib/dhl/shipment";
import { requireAdminRequest } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

type RouteContext = { params: Promise<{ id: string }> };

function trackingUrl(awb: string): string {
  return `https://www.dhl.com/global-en/home/tracking.html?tracking-id=${encodeURIComponent(awb)}`;
}

function packageFromOrder(itemCount: number) {
  const weight = Number(process.env.DHL_DEFAULT_PACKAGE_WEIGHT_KG ?? "0.5");
  const length = Number(process.env.DHL_DEFAULT_PACKAGE_LENGTH_CM ?? "3");
  const width = Number(process.env.DHL_DEFAULT_PACKAGE_WIDTH_CM ?? "2");
  const height = Number(process.env.DHL_DEFAULT_PACKAGE_HEIGHT_CM ?? "1");
  if ([weight, length, width, height].some((value) => !Number.isFinite(value) || value <= 0)) {
    throw new Error("DHL default package dimensions and weight must be positive numbers.");
  }
  return [{ weightKg: weight * Math.max(itemCount, 1), lengthCm: length, widthCm: width, heightCm: height }];
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
    if (order.status !== "paid") {
      return NextResponse.json({ error: "Only paid orders can receive a DHL shipment." }, { status: 409 });
    }
    if (order.dhlTrackingNumber) {
      return NextResponse.json({
        trackingNumber: order.dhlTrackingNumber,
        shipmentIdentificationNumber: order.dhlShipmentIdentificationNumber,
        shippingLabelUrl: order.shippingLabelUrl,
        commercialInvoiceUrl: order.commercialInvoiceUrl,
      });
    }
    if (
      !order.shippingLine1 ||
      !order.shippingCity ||
      !order.shippingPostalCode ||
      !order.shippingCountry ||
      !order.customerPhone
    ) {
      return NextResponse.json({ error: "The order is missing DHL recipient details." }, { status: 422 });
    }

    const shipment = await createDhlShipment({
      reference: order.providerReference,
      currency: order.currency,
      shipper: {
        contact: {
          personName: "Calypto Bait",
          companyName: "Calypto Bait",
          phoneNumber: config.shipperPhone,
          emailAddress: config.shipperEmail,
        },
        address: {
          streetLines: "Calypto Bait",
          city: config.shipperCity,
          postalCode: process.env.DHL_SHIPPER_POSTAL_CODE?.trim() || "00200",
          countryCode: config.shipperCountry,
        },
      },
      recipient: {
        contact: {
          personName: `${order.customerFirstName ?? ""} ${order.customerLastName ?? ""}`.trim() || "Customer",
          phoneNumber: order.customerPhone,
          emailAddress: order.email,
        },
        address: {
          streetLines: [order.shippingLine1, order.shippingLine2].filter(Boolean).join(", "),
          city: order.shippingCity,
          stateOrProvinceCode: order.shippingState ?? undefined,
          postalCode: order.shippingPostalCode,
          countryCode: order.shippingCountry.toUpperCase(),
        },
      },
      packages: packageFromOrder(order.items.reduce((total, item) => total + item.quantity, 0)),
      items: order.items.map((item) => ({
        description: item.name,
        quantity: item.quantity,
        unitPrice: item.priceCents / 100,
        netWeightKg: 0.5 * item.quantity,
        grossWeightKg: 0.5 * item.quantity,
      })),
      customsValue: order.totalCents / 100,
    });

    const updated = await prisma.order.update({
      where: { id },
      data: {
        carrier: "DHL",
        trackingNumber: shipment.trackingNumber,
        trackingUrl: trackingUrl(shipment.trackingNumber),
        dhlTrackingNumber: shipment.trackingNumber,
        dhlShipmentIdentificationNumber: shipment.shipmentIdentificationNumber,
        shippingLabelUrl: shipment.shippingLabelData
          ? `/api/admin/orders/${encodeURIComponent(id)}/shipment?document=label`
          : null,
        commercialInvoiceUrl: shipment.commercialInvoiceData
          ? `/api/admin/orders/${encodeURIComponent(id)}/shipment?document=invoice`
          : null,
        shippingLabelData: shipment.shippingLabelData ?? null,
        commercialInvoiceData: shipment.commercialInvoiceData ?? null,
        dhlRawResponse: JSON.parse(JSON.stringify(shipment.rawResponse)),
        fulfillmentStatus: "PROCESSING",
      },
      select: {
        dhlTrackingNumber: true,
        dhlShipmentIdentificationNumber: true,
        shippingLabelUrl: true,
        commercialInvoiceUrl: true,
      },
    });
    return NextResponse.json(updated, { status: 201 });
  } catch (error) {
    console.error("Unable to create DHL shipment.", error);
    return NextResponse.json({ error: "Unable to create the DHL shipment." }, { status: 502 });
  }
}

export async function GET(request: Request, { params }: RouteContext) {
  const authorization = await requireAdminRequest();
  if (!authorization.ok) return authorization.response;
  const { id } = await params;
  const document = new URL(request.url).searchParams.get("document");
  if (document !== "label" && document !== "invoice") {
    return NextResponse.json({ error: "Document type is invalid." }, { status: 400 });
  }
  const order = await prisma.order.findUnique({
    where: { id },
    select: { shippingLabelData: true, commercialInvoiceData: true },
  });
  if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });
  const data = document === "label" ? order.shippingLabelData : order.commercialInvoiceData;
  if (!data) return NextResponse.json({ error: "Document not found." }, { status: 404 });
  let bytes: Uint8Array;
  try {
    bytes = Uint8Array.from(Buffer.from(data, "base64"));
  } catch {
    return NextResponse.json({ error: "Stored DHL document is invalid." }, { status: 500 });
  }
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return new Response(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="dhl-${document}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
