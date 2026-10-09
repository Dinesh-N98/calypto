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
    select: {
      items: { select: { productSlug: true, sku: true, name: true, quantity: true } },
    },
  });
  if (!order) return Response.json({ error: "Order not found." }, { status: 404 });

  const products = await prisma.product.findMany({
    where: { slug: { in: order.items.map((item) => item.productSlug) } },
    select: {
      slug: true,
      name: true,
      priceCents: true,
      imageUrl: true,
      variants: {
        where: { stock: { gt: 0 } },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          sku: true,
          priceCents: true,
          stock: true,
          size: true,
          color: true,
          imageUrl: true,
        },
      },
    },
  });
  const productBySlug = new Map(products.map((product) => [product.slug, product]));
  const items = order.items.flatMap((item) => {
    const product = productBySlug.get(item.productSlug);
    const variant =
      product?.variants.find(
        (candidate) => candidate.sku === item.sku && candidate.stock >= item.quantity,
      ) ?? product?.variants.find((candidate) => candidate.stock >= item.quantity);
    return product && variant
      ? [
          {
            slug: product.slug,
            name: product.name,
            variantId: variant.id,
            sku: variant.sku,
            variantLabel: [variant.color, variant.size].filter(Boolean).join(" / "),
            priceCents: variant.priceCents,
            imageUrl: variant.imageUrl ?? product.imageUrl,
            quantity: item.quantity,
          },
        ]
      : [];
  });
  const unavailable = order.items
    .filter((item) => {
      const product = productBySlug.get(item.productSlug);
      return !product?.variants.some((variant) => variant.stock >= item.quantity);
    })
    .map((item) => item.name);

  return Response.json({ items, unavailable }, { headers: { "Cache-Control": "private, no-store" } });
}
