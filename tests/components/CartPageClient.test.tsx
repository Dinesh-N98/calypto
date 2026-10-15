// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const cartMocks = vi.hoisted(() => ({
  items: [
    {
      slug: "shoreline-rod",
      variantId: "variant-1",
      sku: "ROD-01",
      variantLabel: "Olive · 7 ft",
      name: "Shoreline Rod",
      priceCents: 12999,
      imageUrl: "/products/shoreline-rod.webp",
      quantity: 2,
    },
  ],
  updateQuantity: vi.fn(),
  removeItem: vi.fn(),
}));

vi.mock("@/components/CartProvider", () => ({
  useCart: () => cartMocks,
}));

vi.mock("next/image", () => ({
  default: ({ alt }: { alt: string }) => <div role="img" aria-label={alt} />,
}));

import CartPageClient from "@/components/CartPageClient";

function renderCart() {
  return render(
    <CartPageClient
      defaultAddress={null}
      isAuthenticated={false}
      profile={null}
      savedAddresses={[]}
      buyNowQuantity={1}
    />,
  );
}

beforeEach(() => {
  vi.stubGlobal("scrollTo", vi.fn());
  cartMocks.items = [
    {
      slug: "shoreline-rod",
      variantId: "variant-1",
      sku: "ROD-01",
      variantLabel: "Olive · 7 ft",
      name: "Shoreline Rod",
      priceCents: 12999,
      imageUrl: "/products/shoreline-rod.webp",
      quantity: 2,
    },
  ];
  cartMocks.updateQuantity.mockClear();
  cartMocks.removeItem.mockClear();
});

describe("CartPageClient", () => {
  it("keeps delivery fields out of the cart review until checkout is selected", async () => {
    const user = userEvent.setup();
    const { container } = renderCart();

    expect(screen.getByRole("heading", { name: "Your cart" })).toBeInTheDocument();
    expect(screen.getAllByText("Shoreline Rod").length).toBeGreaterThan(0);
    const checkoutSection = container.querySelector('section[aria-label="Delivery and payment"]');
    expect(checkoutSection).toHaveAttribute("hidden");

    await user.click(screen.getAllByRole("button", { name: "Proceed to checkout" })[0]);

    expect(screen.getByRole("heading", { name: "Delivery & payment" })).toBeInTheDocument();
    expect(checkoutSection).not.toHaveAttribute("hidden");
    expect(screen.getByLabelText("First name")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Back to cart" })).toBeInTheDocument();
  });

  it("does not claim an unsupported promotion has been applied", async () => {
    const user = userEvent.setup();
    renderCart();
    const [codeInput] = screen.getAllByLabelText("Discount code");

    await user.type(codeInput, "SAVE10");
    await user.click(screen.getAllByRole("button", { name: "Apply" })[0]);

    expect(
      screen.getAllByText(
        "Discount codes are not available at checkout yet. No discount has been applied.",
      ),
    ).toHaveLength(2);
    expect(screen.getAllByText("$259.98").length).toBeGreaterThan(1);
  });
});
