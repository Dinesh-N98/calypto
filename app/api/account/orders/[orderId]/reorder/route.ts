import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ orderId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "You must be signed in." }, { status: 401 });
  }
  const { orderId } = await params;
  const order = await prisma.order.findFirst({
    where: { id: orderId, userId: session.user.id },
    select: { items: { select: { productSlug: true, name: true, quantity: true } } },
  });
  if (!order) return Response.json({ error: "Order not found." }, { status: 404 });

  const products = await prisma.product.findMany({
    where: { slug: { in: order.items.map((item) => item.productSlug) } },
    select: { slug: true, name: true, priceCents: true, imageUrl: true },
  });
  const productBySlug = new Map(products.map((product) => [product.slug, product]));
  const items = order.items.flatMap((item) => {
    const product = productBySlug.get(item.productSlug);
    return product ? [{ ...product, quantity: item.quantity }] : [];
  });
  const unavailable = order.items
    .filter((item) => !productBySlug.has(item.productSlug))
    .map((item) => item.name);

  return Response.json({ items, unavailable }, { headers: { "Cache-Control": "private, no-store" } });
}
