import Stripe from "stripe";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(request: Request) {
  if (!stripeSecretKey || !webhookSecret) {
    return Response.json({ error: "Stripe webhook is not configured." }, { status: 500 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) return Response.json({ error: "Missing Stripe signature." }, { status: 400 });

  const payload = await request.text();
  const stripe = new Stripe(stripeSecretKey);
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch {
    return Response.json({ error: "Invalid Stripe signature." }, { status: 400 });
  }

  if (event.type !== "checkout.session.completed") return Response.json({ received: true });

  const completedSession = event.data.object as Stripe.Checkout.Session;
  const existingOrder = await prisma.order.findUnique({
    where: { stripeSessionId: completedSession.id },
    select: { id: true },
  });
  if (existingOrder) return Response.json({ received: true });

  const session = await stripe.checkout.sessions.retrieve(completedSession.id, {
    expand: ["line_items.data.price.product"],
  });
  const email = session.customer_details?.email;
  const totalCents = session.amount_total;
  if (!email || totalCents === null || !session.line_items?.data.length) {
    return Response.json({ error: "Completed session is missing order details." }, { status: 400 });
  }

  const items = session.line_items.data.map((lineItem) => {
    const product = lineItem.price?.product;
    const priceCents = lineItem.price?.unit_amount;
    if (
      !product ||
      typeof product === "string" ||
      product.deleted ||
      !product.metadata.slug ||
      priceCents === null ||
      priceCents === undefined ||
      !lineItem.quantity
    ) {
      throw new Error("Completed session contains an invalid line item.");
    }
    return {
      productSlug: product.metadata.slug,
      name: product.name,
      priceCents,
      quantity: lineItem.quantity,
    };
  });

  try {
    await prisma.order.create({
      data: {
        userId: session.metadata?.userId || null,
        email,
        stripeSessionId: session.id,
        totalCents,
        items: { create: items },
      },
    });
  } catch (error) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") {
      throw error;
    }
  }

  return Response.json({ received: true });
}