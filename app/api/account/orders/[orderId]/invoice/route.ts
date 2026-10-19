import { auth } from "@/auth";
import { createOrderInvoiceResponse } from "@/lib/order-invoice";
import { prisma } from "@/lib/prisma";

export async function GET(
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
    include: { items: { orderBy: { id: "asc" } } },
  });
  if (!order) return Response.json({ error: "Order not found." }, { status: 404 });

  return createOrderInvoiceResponse(order);
}
