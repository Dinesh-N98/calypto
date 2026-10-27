// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  toMajorUnits,
  trackAddToCart,
  trackBeginCheckout,
  trackPurchase,
  trackViewItem,
  type GaEcommerceItemInput,
} from "@/lib/ga-events";

let mockGtag: ReturnType<typeof vi.fn<(...args: unknown[]) => void>>;

const item: GaEcommerceItemInput = {
  itemId: "SHAD-01",
  itemName: "River Shad",
  itemCategory: "Soft Baits",
  itemVariant: "Green / 4 in",
  priceCents: 1200,
  quantity: 2,
};

beforeEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
  mockGtag = vi.fn<(...args: unknown[]) => void>();
  window.gtag = mockGtag;
});

describe("GA4 ecommerce events", () => {
  it("does not queue events when gtag is not available", () => {
    window.gtag = undefined;

    expect(trackViewItem(item, "USD")).toBe(false);
    expect(trackAddToCart(item, "USD")).toBe(false);
    expect(trackBeginCheckout([item], "USD")).toBe(false);
    expect(
      trackPurchase({
        status: "paid",
        transactionId: "order-no-gtag",
        currency: "USD",
        items: [item],
      }),
    ).toBe(false);
  });

  it("converts cents once and emits only the expected GA item fields", () => {
    expect(toMajorUnits(1234)).toBe(12.34);
    expect(trackViewItem(item, "USD")).toBe(true);

    expect(mockGtag).toHaveBeenCalledWith("event", "view_item", {
      currency: "USD",
      value: 24,
      items: [
        {
          item_id: "SHAD-01",
          item_name: "River Shad",
          item_category: "Soft Baits",
          item_variant: "Green / 4 in",
          price: 12,
          quantity: 2,
        },
      ],
    });
    expect(JSON.stringify(mockGtag.mock.calls)).not.toMatch(
      /@|email|address|phone|private-test-value|[?&][^ ]+=/i,
    );
  });

  it("uses the added quantity and preserves the supplied currency", () => {
    const addedItem = { ...item, quantity: 3 };

    expect(trackAddToCart(addedItem, "CAD")).toBe(true);
    expect(mockGtag).toHaveBeenCalledWith(
      "event",
      "add_to_cart",
      expect.objectContaining({ currency: "CAD", value: 36 }),
    );
    const payload = mockGtag.mock.calls[0]?.[2] as
      | { items: { quantity: number; price: number }[] }
      | undefined;
    expect(payload?.items).toEqual([expect.objectContaining({ quantity: 3, price: 12 })]);
  });

  it("sends one begin_checkout payload with item totals rounded to two decimals", () => {
    const items = [
      { ...item, priceCents: 333, quantity: 1 },
      { ...item, itemId: "BAIT-02", priceCents: 667, quantity: 2 },
    ];

    expect(trackBeginCheckout(items, "USD")).toBe(true);
    expect(mockGtag).toHaveBeenCalledTimes(1);
    expect(mockGtag).toHaveBeenCalledWith(
      "event",
      "begin_checkout",
      expect.objectContaining({
        currency: "USD",
        value: 16.67,
        items: [
          expect.objectContaining({ item_id: "SHAD-01", price: 3.33, quantity: 1 }),
          expect.objectContaining({ item_id: "BAIT-02", price: 6.67, quantity: 2 }),
        ],
      }),
    );
  });

  it("fires a paid purchase once and uses the order item snapshot", () => {
    const purchase = {
      status: "paid",
      transactionId: "CAL-ORDER-001",
      currency: "USD",
      items: [item],
    };

    expect(trackPurchase(purchase)).toBe(true);
    expect(trackPurchase(purchase)).toBe(false);
    expect(mockGtag).toHaveBeenCalledTimes(1);
    expect(mockGtag).toHaveBeenCalledWith(
      "event",
      "purchase",
      expect.objectContaining({
        transaction_id: "CAL-ORDER-001",
        currency: "USD",
        value: 24,
      }),
    );
  });

  it("uses persistent storage to suppress the same transaction after a reload", async () => {
    const purchase = {
      status: "paid",
      transactionId: "CAL-REFRESH-001",
      currency: "USD",
      items: [item],
    };
    expect(trackPurchase(purchase)).toBe(true);

    vi.resetModules();
    const { trackPurchase: trackPurchaseAfterReload } = await import("@/lib/ga-events");
    expect(trackPurchaseAfterReload(purchase)).toBe(false);
    expect(mockGtag).toHaveBeenCalledTimes(1);
  });

  it.each(["pending", "failed", "cancelled", "unknown"])(
    "does not send purchases with %s status",
    (status) => {
      expect(
        trackPurchase({
          status,
          transactionId: `CAL-${status}`,
          currency: "USD",
          items: [item],
        }),
      ).toBe(false);
      expect(mockGtag).not.toHaveBeenCalled();
    },
  );

  it("does not crash or duplicate a purchase when browser storage is unavailable", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("storage unavailable");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("storage unavailable");
    });
    const purchase = {
      status: "paid",
      transactionId: "CAL-STORAGE-UNAVAILABLE",
      currency: "USD",
      items: [item],
    };

    expect(() => trackPurchase(purchase)).not.toThrow();
    expect(trackPurchase(purchase)).toBe(false);
    expect(mockGtag).toHaveBeenCalledTimes(1);
  });
});
