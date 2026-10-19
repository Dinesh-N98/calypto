import type { Order, OrderItem } from "@prisma/client";

type InvoiceOrder = Pick<
  Order,
  | "id"
  | "providerReference"
  | "email"
  | "fulfillmentStatus"
  | "status"
  | "createdAt"
  | "currency"
  | "totalCents"
> & {
  items: Pick<OrderItem, "name" | "quantity" | "priceCents">[];
};

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

export function createOrderInvoiceResponse(order: InvoiceOrder): Response {
  const formatCurrency = (amountCents: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: order.currency }).format(
      amountCents / 100,
    );
  const rows = order.items
    .map(
      (item) =>
        `<tr><td>${escapeHtml(item.name)}</td><td>${item.quantity}</td><td>${escapeHtml(
          formatCurrency(item.priceCents),
        )}</td><td>${escapeHtml(formatCurrency(item.priceCents * item.quantity))}</td></tr>`,
    )
    .join("");
  const total = formatCurrency(order.totalCents);
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
