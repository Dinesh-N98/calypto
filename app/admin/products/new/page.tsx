import { ProductCreateForm } from "@/components/admin/ProductCreateForm";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminCreateProductPage() {
  const categories = await prisma.category.findMany({
    orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, tieredDiscountsEnabled: true },
  });

  return <ProductCreateForm categories={categories} />;
}
