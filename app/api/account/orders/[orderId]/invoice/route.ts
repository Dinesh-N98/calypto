import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character];
  });
}

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

  const rows = order.items
    .map(
      (item) =>
        `<tr><td>${escapeHtml(item.name)}</td><td>${item.quantity}</td><td>${escapeHtml(
          new Intl.NumberFormat("en-US", { style: "currency", currency: order.currency }).format(
            item.priceCents / 100,
          ),
        )}</td><td>${escapeHtml(
          new Intl.NumberFormat("en-US", { style: "currency", currency: order.currency }).format(
            (item.priceCents * item.quantity) / 100,
          ),
        )}</td></tr>`,
    )
    .join("");
  const total = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: order.currency,
  }).format(order.totalCents / 100);
  const html = `<!doctype html><html lang="en"><meta charset="utf-8"><title>Invoice ${escapeHtml(
    order.providerReference,
  )}</title><style>body{font:16px Arial,sans-serif;max-width:800px;margin:48px auto;color:#171812}table{width:100%;border-collapse:collapse;margin-top:24px}th,td{text-align:left;padding:12px;border-bottom:1px solid #ddd}h1{font-size:28px}</style><body><h1>Calypto order invoice</h1><p>Order: ${escapeHtml(
    order.providerReference,
  )}</p><p>Date: ${escapeHtml(
    new Intl.DateTimeFormat("en-US", { dateStyle: "long" }).format(order.createdAt),
  )}</p><p>Customer: ${escapeHtml(order.email)}</p><p>Status: ${escapeHtml(
    order.fulfillmentStatus || order.status,
  )}</p><table><thead><tr><th>Item</th><th>Qty</th><th>Unit price</th><th>Total</th></tr></thead><tbody>${rows}</tbody></table><h2>Total: ${escapeHtml(
    total,
  )}</h2></body></html>`;

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `attachment; filename="invoice-${order.id}.html"`,
      "Cache-Control": "private, no-store",
    },
  });
}
