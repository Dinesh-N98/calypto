import { AdminProductsTable } from "@/components/admin/AdminProductsTable";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage() {
  const [categories, products] = await Promise.all([
    prisma.category.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.product.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        category: { select: { id: true, name: true } },
        images: { orderBy: { order: "asc" }, select: { url: true } },
        variants: {
          orderBy: { createdAt: "asc" },
          select: {
            sku: true,
            size: true,
            color: true,
            priceCents: true,
            discountPriceCents: true,
            stock: true,
            imageUrl: true,
          },
        },
        tieredDiscounts: {
          orderBy: { minQuantity: "asc" },
          select: { minQuantity: true, discountPercentage: true },
        },
      },
    }),
  ]);

  return (
    <AdminProductsTable
      categories={categories}
      products={products.map((product) => ({
        id: product.id,
        name: product.name,
        slug: product.slug,
        description: product.description,
        brand: product.brand,
        priceCents: product.priceCents,
        salePriceCents: product.salePriceCents,
        originalPriceCents: product.originalPriceCents,
        saleEndsAt: product.saleEndsAt,
        imageUrl: product.imageUrl,
        images: product.images,
        variants: product.variants,
        tieredDiscounts: product.tieredDiscounts,
        categoryId: product.categoryId,
        categoryName: product.category.name,
      }))}
    />
  );
}
