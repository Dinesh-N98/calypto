import { AdminCategoriesTable } from "@/components/admin/AdminCategoriesTable";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage() {
  const categories = await prisma.category.findMany({
    orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
    include: { _count: { select: { products: true } } },
  });

  return (
    <AdminCategoriesTable
      key={JSON.stringify(
        categories.map((category) => [
          category.id,
          category.name,
          category.slug,
          category.image,
          category.displayOrder,
          category.tieredDiscountsEnabled,
          category._count.products,
        ]),
      )}
      categories={categories.map((category) => ({
        id: category.id,
        name: category.name,
        slug: category.slug,
        image: category.image,
        displayOrder: category.displayOrder,
        tieredDiscountsEnabled: category.tieredDiscountsEnabled,
        productCount: category._count.products,
      }))}
    />
  );
}
