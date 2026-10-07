import { AdminOrdersTable } from "@/components/admin/AdminOrdersTable";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage() {
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      providerReference: true,
      email: true,
      status: true,
      fulfillmentStatus: true,
      carrier: true,
      trackingNumber: true,
      trackingUrl: true,
      createdAt: true,
      totalCents: true,
      currency: true,
    },
  });

  return <AdminOrdersTable orders={orders} />;
}
