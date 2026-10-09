import { AdminCategoriesTable } from "@/components/admin/AdminCategoriesTable";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage() {
  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { products: true } } },
  });

  return (
    <AdminCategoriesTable
      categories={categories.map((category) => ({
        id: category.id,
        name: category.name,
        slug: category.slug,
        tieredDiscountsEnabled: category.tieredDiscountsEnabled,
        productCount: category._count.products,
      }))}
    />
  );
}
