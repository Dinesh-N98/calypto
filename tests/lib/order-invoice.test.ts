import { describe, expect, it } from "vitest";
import { createOrderInvoiceResponse } from "@/lib/order-invoice";

describe("createOrderInvoiceResponse", () => {
  it("escapes order and item data in downloadable invoice HTML", async () => {
    const response = createOrderInvoiceResponse({
      id: "order-1",
      providerReference: "<img src=x>",
      email: "<script>alert(1)</script>",
      fulfillmentStatus: null,
      status: "paid",
      createdAt: new Date("2026-10-01T12:00:00.000Z"),
      currency: "USD",
      totalCents: 1500,
      items: [{ name: "<b>Product</b>", quantity: 1, priceCents: 1500 }],
    });
    const html = await response.text();

    expect(response.headers.get("Content-Disposition")).toBe(
      'attachment; filename="invoice-order-1.html"',
    );
    expect(html).toContain("&lt;img src=x&gt;");
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).toContain("&lt;b&gt;Product&lt;/b&gt;");
    expect(html).not.toContain("<script>alert(1)</script>");
  });
});
