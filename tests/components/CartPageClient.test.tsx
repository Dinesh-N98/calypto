// @vitest-environment jsdom

import { render, screen, waitFor } from "@testing-library/react";
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

const internationalProfile = {
  firstName: "Ada",
  lastName: "Lovelace",
  email: "ada@example.com",
  phone: "+94771234567",
};

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
  it("routes checkout directly to the automated checkout page", async () => {
    const { container } = renderCart();

    expect(screen.getByRole("heading", { name: "Your cart" })).toBeInTheDocument();
    expect(screen.getAllByText("Shoreline Rod").length).toBeGreaterThan(0);
    const checkoutSection = container.querySelector('section[aria-label="Delivery and payment"]');
    expect(checkoutSection).toHaveAttribute("hidden");

    const checkoutLinks = screen.getAllByRole("link", { name: "Proceed to checkout" });
    expect(checkoutLinks[0]).toHaveAttribute("href", "/checkout");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders accessible checkout progress and a mobile order summary", () => {
    render(
      <CartPageClient
        defaultAddress={null}
        isAuthenticated={false}
        profile={null}
        savedAddresses={[]}
        buyNowQuantity={1}
        startAtCheckout
      />,
    );

    expect(screen.getByRole("list", { name: "Checkout progress" })).toBeInTheDocument();
    expect(screen.getByText("Cart")).toBeInTheDocument();
    expect(screen.getByText("Details")).toBeInTheDocument();
    expect(screen.getByText("Delivery")).toBeInTheDocument();
    expect(screen.getByText("Payment")).toBeInTheDocument();
    expect(
      screen.getAllByRole("listitem").find((item) => item.querySelector('[aria-current="step"]')),
    ).toBeInTheDocument();

    const summary = screen
      .getAllByText("Order summary")
      .map((element) => element.closest("details"))
      .find(
        (element): element is HTMLDetailsElement =>
          element !== null && element.textContent?.includes("Shoreline Rod") === true,
      );
    expect(summary).toBeInTheDocument();
    expect(summary).toHaveTextContent("Shoreline Rod");
    expect(summary).toHaveTextContent("Qty 2");
    expect(summary).toHaveTextContent("$259.98");
    expect(summary).toHaveTextContent("Secure checkout powered by OnePay.");
  });

  it("explains manual inquiry redemption without changing cart totals", async () => {
    const user = userEvent.setup();
    renderCart();
    const [codeInput] = screen.getAllByLabelText("Discount code");

    await user.type(codeInput, "CREW-01ABCDEF");
    await user.click(screen.getAllByRole("button", { name: "Apply" })[0]);

    expect(
      screen.getAllByText(
        "Discount codes are applied manually when you send your order inquiry. Add your code in the inquiry form.",
      ),
    ).toHaveLength(2);
    expect(screen.getAllByText("$259.98").length).toBeGreaterThan(1);

    expect(screen.getAllByRole("link", { name: "Proceed to checkout" })[0]).toHaveAttribute(
      "href",
      "/checkout",
    );
  });

  it("propagates the auto-selected DHL rate into the summary and checkout state", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            rates: [
              {
                serviceCode: "P",
                serviceName: "P",
                currency: "USD",
                amount: 31.27,
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );

    render(
      <CartPageClient
        defaultAddress={{
          id: "international",
          line1: "1 Main Street",
          line2: null,
          city: "Toronto",
          state: "ON",
          postalCode: "M5H 2N2",
          country: "CA",
          isDefault: true,
        }}
        isAuthenticated={false}
        profile={internationalProfile}
        savedAddresses={[]}
        buyNowQuantity={1}
        startAtCheckout
      />,
    );

    await user.click(screen.getByRole("button", { name: "Continue to delivery" }));

    const checkoutButton = screen.getByRole("button", { name: /Continue to payment/ });
    expect(checkoutButton).toBeDisabled();

    await waitFor(() => {
      expect(screen.getByText("DHL Express Worldwide")).toBeInTheDocument();
      expect(checkoutButton).toBeEnabled();
    });
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Calculate shipping" })).not.toBeInTheDocument();
    await user.click(checkoutButton);
    expect(screen.getByRole("button", { name: "Review order" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Review order" }));
    expect(screen.getByRole("heading", { name: "Review your order" })).toBeInTheDocument();
    expect(screen.getByText("Step 5 of 5")).toBeInTheDocument();
    expect(screen.queryByText("Step 5 of 4")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Choose your payment method" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("Complete your secure payment to place the order."),
    ).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Edit" })).toHaveLength(3);
    expect(screen.queryByRole("button", { name: "Back to payment" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Checkout/ })).toBeEnabled();
    expect(screen.getAllByText("$31.27").length).toBeGreaterThan(0);
    expect(screen.getAllByText("$291.25").length).toBeGreaterThan(0);
    expect(screen.queryByText("Taxes")).not.toBeInTheDocument();
  });
});
