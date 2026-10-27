// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StrictMode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  addItem: vi.fn(),
  showToast: vi.fn(),
}));

vi.mock("@/components/CartProvider", () => ({
  useCart: () => ({ addItem: mocks.addItem }),
}));
vi.mock("@/components/ToastProvider", () => ({
  useToast: () => ({ showToast: mocks.showToast }),
}));
vi.mock("next/image", () => ({
  default: ({ alt }: { alt: string }) => <div role="img" aria-label={alt} />,
}));
vi.mock("@/components/WishlistButton", () => ({
  WishlistButton: () => null,
}));

import { ProductDetailExperience } from "@/components/ProductDetailExperience";
import { GA_READY_EVENT } from "@/lib/ga-events";

const product = {
  id: "product-1",
  slug: "river-shad",
  name: "River Shad",
  description: "A soft bait for the next cast.",
  brand: "Calypto",
  imageUrl: "/river-shad.webp",
  priceCents: 1200,
  salePriceCents: null,
  originalPriceCents: null,
  saleEndsAt: null,
  tieredDiscountsEnabled: false,
};

beforeEach(() => {
  mocks.addItem.mockClear();
  mocks.showToast.mockClear();
  window.gtag = vi.fn();
});

describe("ProductDetailExperience", () => {
  it("adds the selected item and opens an inquiry when Buy Now is clicked", async () => {
    const user = userEvent.setup();
    render(
      <ProductDetailExperience
        categoryName="Soft Baits"
        images={[]}
        product={product}
        tieredDiscounts={[]}
        variants={[
          {
            id: "variant-1",
            sku: "SHAD-01",
            priceCents: 1200,
            discountPriceCents: null,
            stock: 8,
            size: "4 in",
            color: "Green",
            imageUrl: null,
          },
        ]}
      />,
    );

    expect(screen.queryByText("Ratings (0)")).not.toBeInTheDocument();
    expect(
      screen.queryByText("Price per item after applicable quantity discounts"),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/Informational estimate: 3 monthly installments/)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Increase quantity of item" }));
    await user.click(screen.getByRole("button", { name: "Buy Now" }));

    expect(mocks.addItem).toHaveBeenCalledWith(
      expect.objectContaining({ name: "River Shad", variantId: "variant-1" }),
      2,
    );
    expect(window.gtag).toHaveBeenCalledWith(
      "event",
      "add_to_cart",
      expect.objectContaining({
        currency: "USD",
        value: 24,
        items: [
          expect.objectContaining({
            item_id: "SHAD-01",
            item_name: "River Shad",
            item_category: "Soft Baits",
            item_variant: "Green / 4 in",
            price: 12,
            quantity: 2,
          }),
        ],
      }),
    );
    expect(screen.getByRole("dialog", { name: "Direct Order Inquiry" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Send Inquiry via Form" })).toHaveAttribute(
      "href",
      "/contact#lead-source=buy_now",
    );
  });

  it("sends one view_item per product id under StrictMode and waits for consent", () => {
    window.gtag = undefined;
    const firstProduct = { ...product };
    const variants = [
      {
        id: "variant-1",
        sku: "SHAD-01",
        priceCents: 1200,
        discountPriceCents: null,
        stock: 8,
        size: "4 in",
        color: "Green",
        imageUrl: null,
      },
    ];
    const props = {
      categoryName: "Soft Baits",
      images: [],
      product: firstProduct,
      tieredDiscounts: [],
      variants,
    };
    const view = render(
      <StrictMode>
        <ProductDetailExperience {...props} />
      </StrictMode>,
    );
    const gtag = vi.fn();

    expect(gtag).not.toHaveBeenCalled();
    window.gtag = gtag;
    window.dispatchEvent(new Event(GA_READY_EVENT));
    expect(gtag).toHaveBeenCalledTimes(1);
    expect(gtag).toHaveBeenLastCalledWith(
      "event",
      "view_item",
      expect.objectContaining({
        currency: "USD",
        value: 12,
        items: [expect.objectContaining({ item_id: "SHAD-01", item_name: "River Shad" })],
      }),
    );

    view.rerender(
      <StrictMode>
        <ProductDetailExperience {...props} />
      </StrictMode>,
    );
    expect(gtag).toHaveBeenCalledTimes(1);

    view.rerender(
      <StrictMode>
        <ProductDetailExperience {...props} product={{ ...firstProduct, id: "product-2" }} />
      </StrictMode>,
    );
    expect(gtag).toHaveBeenCalledTimes(2);
  });
});
