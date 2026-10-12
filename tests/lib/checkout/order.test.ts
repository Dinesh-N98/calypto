import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CheckoutPayload } from "@/lib/checkout/types";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  transaction: vi.fn(),
  variantFindMany: vi.fn(),
  variantUpdateMany: vi.fn(),
  addressCount: vi.fn(),
  addressCreate: vi.fn(),
  orderCreate: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: mocks.transaction,
    productVariant: { findMany: mocks.variantFindMany },
  },
}));

import { createPendingCheckoutOrder } from "@/lib/checkout/order";

const variant = {
  id: "variant-1",
  sku: "ROD-001",
  priceCents: 1999,
  discountPriceCents: null,
  stock: 5,
  size: null,
  color: null,
  product: {
    slug: "river-rod",
    name: "River Rod",
    imageUrl: "/rod.jpg",
    salePriceCents: null,
    saleEndsAt: null,
    tieredDiscountsEnabled: false,
    category: { tieredDiscountsEnabled: false },
    tieredDiscounts: [],
  },
};

const payload: CheckoutPayload = {
  items: [{ variantId: "variant-1", quantity: 1 }],
  customer: {
    firstName: "Ada",
    lastName: "Lovelace",
    email: "ada@example.com",
    phone: "+94771234567",
  },
  address: {
    streetAddress: "12 River Road",
    aptSuite: "Unit 4",
    city: "Colombo",
    state: "Western",
    postalCode: "00100",
    country: "Sri Lanka",
  },
  saveAddress: false,
};

const createdOrder = {
  id: "order-1",
  providerReference: "CAL-TEST",
  totalCents: 1999,
  currency: "USD",
  userId: "user-1",
};

beforeEach(() => {
  mocks.auth.mockResolvedValue({ user: { id: "user-1" } });
  mocks.variantFindMany.mockResolvedValue([variant]);
  mocks.variantUpdateMany.mockResolvedValue({ count: 1 });
  mocks.addressCount.mockResolvedValue(1);
  mocks.addressCreate.mockResolvedValue({ id: "address-2" });
  mocks.orderCreate.mockResolvedValue(createdOrder);
  mocks.transaction.mockImplementation(async (callback) =>
    callback({
      productVariant: { updateMany: mocks.variantUpdateMany },
      address: {
        count: mocks.addressCount,
        create: mocks.addressCreate,
      },
      order: { create: mocks.orderCreate },
    }),
  );
});

describe("createPendingCheckoutOrder", () => {
  it("persists authenticated customer and shipping snapshots from submitted values", async () => {
    const order = await createPendingCheckoutOrder({ payload, provider: "ONEPAY" });

    expect(mocks.orderCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "user-1",
          email: "ada@example.com",
          customerFirstName: "Ada",
          customerLastName: "Lovelace",
          customerPhone: "+94771234567",
          shippingName: "Ada Lovelace",
          shippingLine1: "12 River Road",
          shippingLine2: "Unit 4",
          shippingCity: "Colombo",
          shippingState: "Western",
          shippingPostalCode: "00100",
          shippingCountry: "Sri Lanka",
        }),
      }),
    );
    expect(mocks.addressCreate).not.toHaveBeenCalled();
    expect(order).toMatchObject({ id: "order-1", userId: "user-1" });
  });

  it("creates a saved address only when the signed-in customer opts in", async () => {
    await createPendingCheckoutOrder({
      payload: { ...payload, saveAddress: true },
      provider: "ONEPAY",
    });

    expect(mocks.addressCreate).toHaveBeenCalledWith({
      data: {
        userId: "user-1",
        line1: "12 River Road",
        line2: "Unit 4",
        city: "Colombo",
        state: "Western",
        postalCode: "00100",
        country: "Sri Lanka",
        isDefault: false,
      },
    });
  });
});
