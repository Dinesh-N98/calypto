import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAdminRequest: vi.fn(),
  findUnique: vi.fn(),
  orderFindUnique: vi.fn(),
  update: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("@/lib/admin", () => ({ requireAdminRequest: mocks.requireAdminRequest }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: mocks.transaction,
    order: { findUnique: mocks.orderFindUnique },
  },
}));
vi.mock("@/lib/email", () => ({ sendShippingConfirmationEmail: vi.fn() }));

import { GET as getOrderDetails } from "@/app/api/admin/orders/[orderId]/route";
import { PATCH } from "@/app/api/admin/orders/[orderId]/fulfillment/route";

describe("admin order fulfillment route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAdminRequest.mockResolvedValue({ ok: true, user: { id: "admin-1" } });
    mocks.orderFindUnique.mockResolvedValue(null);
    mocks.findUnique.mockResolvedValue({ fulfillmentStatus: "PROCESSING" });
    mocks.update.mockResolvedValue({
      id: "order-1",
      status: "paid",
      fulfillmentStatus: "DELIVERED",
      carrier: null,
      trackingNumber: null,
      trackingUrl: null,
    });
    mocks.transaction.mockImplementation((callback) =>
      callback({
        order: {
          findUnique: mocks.findUnique,
          update: mocks.update,
        },
      }),
    );
  });

  it("returns 404 when an admin requests a missing order", async () => {
    const response = await getOrderDetails(
      new Request("https://admin.example.test/api/admin/orders/missing"),
      { params: Promise.resolve({ orderId: "missing" }) },
    );

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Order not found." });
  });

  it("allows admin-only fulfillment status updates without overwriting tracking data", async () => {
    const request = new Request("https://admin.example.test/api/admin/orders/order-1/fulfillment", {
      method: "PATCH",
      headers: {
        origin: "https://admin.example.test",
        "content-type": "application/json",
      },
      body: JSON.stringify({ status: "DELIVERED" }),
    });

    const response = await PATCH(request, { params: Promise.resolve({ orderId: "order-1" }) });
    const result = await response.json();

    expect(response.status).toBe(200);
    expect(result.order.fulfillmentStatus).toBe("DELIVERED");
    expect(mocks.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { fulfillmentStatus: "DELIVERED" } }),
    );
  });

  it("rejects unsupported fulfillment states", async () => {
    const request = new Request("https://admin.example.test/api/admin/orders/order-1/fulfillment", {
      method: "PATCH",
      headers: {
        origin: "https://admin.example.test",
        "content-type": "application/json",
      },
      body: JSON.stringify({ status: "REFUNDED" }),
    });

    const response = await PATCH(request, { params: Promise.resolve({ orderId: "order-1" }) });

    expect(response.status).toBe(400);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
});
