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
      include: { category: { select: { id: true, name: true } } },
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
        priceCents: product.priceCents,
        imageUrl: product.imageUrl,
        categoryId: product.categoryId,
        categoryName: product.category.name,
      }))}
    />
  );
}
