import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findFirst: vi.fn(),
  refreshOnePayOrderStatus: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: { order: { findFirst: mocks.findFirst } },
}));
vi.mock("@/lib/onepay", () => ({
  refreshOnePayOrderStatus: mocks.refreshOnePayOrderStatus,
}));

import { GET } from "@/app/api/checkout/status/route";

const order = {
  id: "order-id",
  paymentProvider: "PAYPAL",
  providerTransactionId: "provider-transaction",
  providerReference: "CAL-ORDER-001",
  totalCents: 2400,
  currency: "USD",
  status: "paid",
  items: [
    {
      sku: "SHAD-01",
      productSlug: "river-shad",
      variantId: "variant-1",
      name: "River Shad (Green / 4 in)",
      priceCents: 1200,
      quantity: 2,
    },
  ],
};

function request() {
  return new Request("https://calyptobait.com/api/checkout/status?reference=CAL-ORDER-001");
}

beforeEach(() => {
  mocks.findFirst.mockClear();
  mocks.refreshOnePayOrderStatus.mockClear();
  mocks.findFirst.mockResolvedValue(order);
  mocks.refreshOnePayOrderStatus.mockResolvedValue("pending");
});

describe("GET /api/checkout/status purchase data", () => {
  it("returns the order snapshot only after the order is paid", async () => {
    const response = await GET(request());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      status: "paid",
      purchase: {
        transactionId: "CAL-ORDER-001",
        totalCents: 2400,
        currency: "USD",
        items: order.items,
      },
    });
    expect(JSON.stringify(mocks.findFirst.mock.calls)).not.toMatch(
      /email|customerFirstName|customerPhone|shippingLine1/i,
    );
  });

  it("does not return purchase details for a pending order", async () => {
    mocks.findFirst.mockResolvedValue({ ...order, status: "pending" });
    const response = await GET(request());

    expect(await response.json()).toEqual({ status: "pending" });
  });

  it("includes the server-confirmed OnePay order snapshot when payment refresh succeeds", async () => {
    mocks.findFirst.mockResolvedValue({ ...order, paymentProvider: "ONEPAY", status: "pending" });
    mocks.refreshOnePayOrderStatus.mockResolvedValue("paid");

    const response = await GET(request());

    expect(mocks.refreshOnePayOrderStatus).toHaveBeenCalledOnce();
    expect(await response.json()).toMatchObject({
      status: "paid",
      purchase: {
        transactionId: "CAL-ORDER-001",
        totalCents: 2400,
        items: order.items,
      },
    });
  });
});
