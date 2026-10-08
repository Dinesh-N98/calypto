import { AdminPromotionsTable } from "@/components/admin/AdminPromotionsTable";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminPromotionsPage() {
  const promotions = await prisma.promotion.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <AdminPromotionsTable
      promotions={promotions.map((promotion) => ({
        id: promotion.id,
        title: promotion.title,
        description: promotion.description,
        imageUrl: promotion.imageUrl,
        discountPercent: promotion.discountPercent,
        discountCode: promotion.discountCode,
        isActive: promotion.isActive,
        startDate: promotion.startDate?.toISOString().slice(0, 10) ?? "",
        endDate: promotion.endDate?.toISOString().slice(0, 10) ?? "",
      }))}
    />
  );
}
