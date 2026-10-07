import { after, NextResponse } from "next/server";
import { requireAdminRequest } from "@/lib/admin";
import { sendShippingConfirmationEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ orderId: string }> };
type FulfillmentStatus = "PROCESSING" | "SHIPPED" | "DELIVERED" | "CANCELLED";

const allowedStatuses: FulfillmentStatus[] = ["PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"];

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFulfillmentStatus(value: unknown): value is FulfillmentStatus {
  return typeof value === "string" && allowedStatuses.includes(value as FulfillmentStatus);
}

function getDhlTrackingUrl(trackingNumber: string): string {
  return `https://www.dhl.com/global-en/home/tracking.html?tracking-id=${encodeURIComponent(trackingNumber)}`;
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const authorization = await requireAdminRequest();
  if (!authorization.ok) return authorization.response;

  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: "Cross-origin updates are not allowed." }, { status: 403 });
  }

  const { orderId } = await params;
  if (!orderId || orderId.length > 191) {
    return NextResponse.json({ error: "Order ID is invalid." }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
  if (!isObject(body)) {
    return NextResponse.json({ error: "Fulfillment details are invalid." }, { status: 400 });
  }

  const carrier = typeof body.carrier === "string" ? body.carrier.trim() : "";
  const trackingNumber = typeof body.trackingNumber === "string" ? body.trackingNumber.trim() : "";
  const rawTrackingUrl = typeof body.trackingUrl === "string" ? body.trackingUrl.trim() : "";
  const status = body.status === undefined ? "SHIPPED" : body.status;
  if (!carrier || carrier.length > 100 || !trackingNumber || trackingNumber.length > 200) {
    return NextResponse.json(
      { error: "Enter a carrier and a valid tracking number." },
      { status: 400 },
    );
  }
  if (!isFulfillmentStatus(status)) {
    return NextResponse.json({ error: "Fulfillment status is invalid." }, { status: 400 });
  }

  if (rawTrackingUrl.length > 2000) {
    return NextResponse.json({ error: "Tracking URL is too long." }, { status: 400 });
  }
  const trackingUrl =
    rawTrackingUrl || (carrier.toLowerCase() === "dhl" ? getDhlTrackingUrl(trackingNumber) : "");
  if (trackingUrl) {
    try {
      const parsedUrl = new URL(trackingUrl);
      if (parsedUrl.protocol !== "https:") throw new Error("Tracking URLs must use HTTPS.");
    } catch {
      return NextResponse.json({ error: "Enter a valid HTTPS tracking URL." }, { status: 400 });
    }
  }

  try {
    const updated = await prisma.$transaction(async (transaction) => {
      const previousOrder = await transaction.order.findUnique({
        where: { id: orderId },
        select: { fulfillmentStatus: true },
      });
      if (!previousOrder) return null;

      // Update fulfillment fields only: payment status and the user/order relation stay intact.
      const order = await transaction.order.update({
        where: { id: orderId },
        data: {
          carrier,
          trackingNumber,
          trackingUrl: trackingUrl || null,
          fulfillmentStatus: status,
        },
        select: {
          id: true,
          status: true,
          fulfillmentStatus: true,
          carrier: true,
          trackingNumber: true,
          trackingUrl: true,
        },
      });
      return { order, wasShipped: previousOrder.fulfillmentStatus === "SHIPPED" };
    });
    if (!updated) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    if (status === "SHIPPED" && !updated.wasShipped) {
      // Run notification work after the response; email outages must not undo fulfillment.
      after(async () => {
        try {
          const orderForEmail = await prisma.order.findUnique({
            where: { id: orderId },
            select: {
              providerReference: true,
              email: true,
              customerFirstName: true,
              customerLastName: true,
              user: { select: { email: true, name: true } },
              items: { select: { name: true, quantity: true } },
            },
          });
          if (!orderForEmail) throw new Error("Order not found while preparing shipping email.");

          const appBaseUrl = process.env.APP_BASE_URL;
          if (!appBaseUrl) throw new Error("APP_BASE_URL must be configured for shipping emails.");
          const baseUrl = new URL(appBaseUrl);
          if (
            baseUrl.protocol !== "https:" ||
            baseUrl.username ||
            baseUrl.password ||
            baseUrl.pathname !== "/" ||
            baseUrl.search ||
            baseUrl.hash
          ) {
            throw new Error("APP_BASE_URL must be a public HTTPS origin.");
          }

          await sendShippingConfirmationEmail(orderForEmail.user?.email ?? orderForEmail.email, {
            customerName:
              [orderForEmail.customerFirstName, orderForEmail.customerLastName]
                .filter(Boolean)
                .join(" ") ||
              orderForEmail.user?.name ||
              "there",
            orderReference: orderForEmail.providerReference,
            carrier: updated.order.carrier ?? carrier,
            trackingNumber: updated.order.trackingNumber ?? trackingNumber,
            trackingUrl: updated.order.trackingUrl,
            items: orderForEmail.items,
            orderUrl: new URL("/account/orders", baseUrl).toString(),
          });
        } catch (emailError) {
          console.error("Unable to send order shipping confirmation email.", emailError);
        }
      });
    }

    return NextResponse.json({ order: updated.order });
  } catch (error) {
    console.error("Unable to update order fulfillment.", error);
    return NextResponse.json({ error: "Unable to update fulfillment details." }, { status: 500 });
  }
}
