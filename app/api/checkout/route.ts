import Stripe from "stripe";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

type CartPayload = { slug?: unknown; quantity?: unknown };

function isValidCartItem(item: CartPayload): item is { slug: string; quantity: number } {
  return (
    typeof item.slug === "string" &&
    item.slug.length > 0 &&
    typeof item.quantity === "number" &&
    Number.isInteger(item.quantity) &&
    item.quantity > 0
  );
}

export async function POST(request: Request) {
  if (!stripeSecretKey) {
    return Response.json({ error: "Stripe is not configured." }, { status: 500 });
  }

  const body: unknown = await request.json().catch(() => null);
  const rawItems = body && typeof body === "object" && "items" in body ? body.items : null;
  if (!Array.isArray(rawItems) || rawItems.length === 0 || !rawItems.every(isValidCartItem)) {
    return Response.json({ error: "Your cart is empty or invalid." }, { status: 400 });
  }

  const quantities = new Map<string, number>();
  for (const item of rawItems) {
    quantities.set(item.slug, (quantities.get(item.slug) ?? 0) + item.quantity);
  }

  const products = await prisma.product.findMany({
    where: { slug: { in: [...quantities.keys()] } },
    select: { slug: true, name: true, priceCents: true },
  });
  if (products.length !== quantities.size) {
    return Response.json({ error: "One or more products are no longer available." }, { status: 400 });
  }

  const session = await auth();
  const userId = session?.user?.id;
  const origin = request.headers.get("origin") ?? new URL(request.url).origin;
  const stripe = new Stripe(stripeSecretKey);

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: products.map((product) => ({
      quantity: quantities.get(product.slug),
      price_data: {
        currency: "usd",
        unit_amount: product.priceCents,
        product_data: {
          name: product.name,
          metadata: { slug: product.slug },
        },
      },
    })),
    metadata: userId ? { userId } : undefined,
    success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/checkout/cancel`,
  });

  if (!checkoutSession.url) {
    return Response.json({ error: "Stripe did not return a checkout URL." }, { status: 502 });
  }

  return Response.json({ url: checkoutSession.url });
}