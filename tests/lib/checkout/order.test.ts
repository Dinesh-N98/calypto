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
  getCheckoutShippingRates: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: mocks.transaction,
    productVariant: { findMany: mocks.variantFindMany },
  },
}));
vi.mock("@/lib/config/dhl", () => ({
  getDhlConfig: () => ({ defaultPackage: { weightKg: 0.5, lengthCm: 3, widthCm: 2, heightCm: 1 } }),
}));
vi.mock("@/lib/dhl/rate", () => ({
  buildDhlPackage: vi.fn(() => ({
    weightKg: 0.5,
    lengthCm: 3,
    widthCm: 2,
    heightCm: 1,
  })),
}));
vi.mock("@/lib/checkout/sri-lanka-shipping", () => ({
  getCheckoutShippingRates: mocks.getCheckoutShippingRates,
}));

import { createPendingCheckoutOrder, parseCheckoutPayload } from "@/lib/checkout/order";

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
    trackInventory: true,
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
  shippingServiceCode: "P",
};

const createdOrder = {
  id: "order-1",
  providerReference: "CAL-TEST",
  totalCents: 1999,
  currency: "USD",
  userId: "user-1",
};

beforeEach(() => {
  mocks.getCheckoutShippingRates.mockClear();
  mocks.auth.mockResolvedValue({ user: { id: "user-1" } });
  mocks.variantFindMany.mockResolvedValue([variant]);
  mocks.variantUpdateMany.mockResolvedValue({ count: 1 });
  mocks.addressCount.mockResolvedValue(1);
  mocks.addressCreate.mockResolvedValue({ id: "address-2" });
  mocks.orderCreate.mockResolvedValue(createdOrder);
  mocks.getCheckoutShippingRates.mockResolvedValue([
    { serviceCode: "P", serviceName: "DHL Express Domestic", currency: "USD", amount: 8.5 },
  ]);
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
          providerReference: expect.stringMatching(/^CAL-[A-F0-9]{17}$/u),
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
          shippingCents: 850,
          shippingServiceCode: "P",
          totalCents: 2849,
        }),
      }),
    );
    expect(mocks.getCheckoutShippingRates).toHaveBeenCalledWith(
      expect.objectContaining({
        recipient: expect.objectContaining({
          countryCode: "LK",
          postalCode: "00100",
        }),
        packages: [expect.objectContaining({ weightKg: 0.5 })],
      }),
    );
    const orderCreateData = mocks.orderCreate.mock.calls[0][0].data;
    expect(orderCreateData.providerReference).toHaveLength(21);
    expect(mocks.addressCreate).not.toHaveBeenCalled();
    expect(order).toMatchObject({ id: "order-1", userId: "user-1" });
  });

  it("recalculates the Sri Lanka fallback amount on the server", async () => {
    mocks.getCheckoutShippingRates.mockResolvedValueOnce([
      {
        serviceCode: "LK-LOCAL-WEIGHT",
        serviceName: "Sri Lanka local delivery (under 1 kg)",
        currency: "USD",
        amount: 3,
      },
    ]);

    await createPendingCheckoutOrder({
      payload: { ...payload, shippingServiceCode: "LK-LOCAL-WEIGHT" },
      provider: "ONEPAY",
    });

    expect(mocks.orderCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          shippingCents: 300,
          shippingServiceCode: "LK-LOCAL-WEIGHT",
          totalCents: 2299,
        }),
      }),
    );
  });

  it("does not reserve stock for untracked products and snapshots the setting on order items", async () => {
    mocks.variantFindMany.mockResolvedValueOnce([
      {
        ...variant,
        stock: 0,
        product: { ...variant.product, trackInventory: false },
      },
    ]);

    await createPendingCheckoutOrder({ payload, provider: "ONEPAY" });

    expect(mocks.variantUpdateMany).not.toHaveBeenCalled();
    expect(mocks.orderCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          items: {
            create: [expect.objectContaining({ inventoryTracked: false })],
          },
        }),
      }),
    );
  });

  describe("parseCheckoutPayload", () => {
    it("accepts checkout addresses without the optional third address line", () => {
      const parsed = parseCheckoutPayload({
        ...payload,
        address: {
          ...payload.address,
          addressLine3: "",
        },
      });

      expect(parsed.address.addressLine3).toBe("");
    });

    it("rejects unexpected fields and oversized quantities", () => {
      expect(() =>
        parseCheckoutPayload({
          ...payload,
          unexpected: true,
        }),
      ).toThrow("Your cart is empty or invalid.");
      expect(() =>
        parseCheckoutPayload({
          ...payload,
          items: [{ variantId: "variant-1", quantity: 1001 }],
        }),
      ).toThrow("Your cart is empty or invalid.");
    });
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
