// @vitest-environment jsdom

import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  clearCart: vi.fn(),
  trackPurchase: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams("?order=CAL-ORDER-001"),
}));
vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));
vi.mock("@/components/CartProvider", () => ({
  useCart: () => ({ clearCart: mocks.clearCart }),
}));
vi.mock("@/components/Reveal", () => ({
  Reveal: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
}));
vi.mock("@/lib/ga-events", () => ({
  GA_READY_EVENT: "calypto-ga-ready",
  trackPurchase: mocks.trackPurchase,
}));

import { CheckoutResult } from "@/components/CheckoutResult";

const paidResponse = {
  status: "paid",
  purchase: {
    transactionId: "CAL-ORDER-001",
    totalCents: 2400,
    currency: "USD",
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
  },
};

beforeEach(() => {
  mocks.clearCart.mockClear();
  mocks.trackPurchase.mockClear();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("CheckoutResult purchase tracking", () => {
  it("tracks only the paid order snapshot and clears the cart", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => paidResponse,
      }),
    );

    render(<CheckoutResult />);

    await waitFor(() => {
      expect(mocks.trackPurchase).toHaveBeenCalledWith({
        status: "paid",
        transactionId: "CAL-ORDER-001",
        currency: "USD",
        items: [
          {
            itemId: "SHAD-01",
            itemName: "River Shad (Green / 4 in)",
            priceCents: 1200,
            quantity: 2,
          },
        ],
      });
    });
    expect(mocks.clearCart).toHaveBeenCalledOnce();
  });

  it.each(["pending", "failed", "cancelled"])(
    "does not track a %s payment",
    async (status) => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({ status }),
        }),
      );

      render(<CheckoutResult />);

      await waitFor(() => expect(mocks.clearCart).not.toHaveBeenCalled());
      expect(mocks.trackPurchase).not.toHaveBeenCalled();
    },
  );
});
