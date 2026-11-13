// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StrictMode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  addItem: vi.fn(),
  routerPush: vi.fn(),
  showToast: vi.fn(),
}));

vi.mock("@/components/CartProvider", () => ({
  useCart: () => ({ addItem: mocks.addItem }),
}));
vi.mock("@/components/ToastProvider", () => ({
  useToast: () => ({ showToast: mocks.showToast }),
}));
vi.mock("next/image", () => ({
  default: ({ alt, src }: { alt: string; src: string }) => (
    <div role="img" aria-label={alt} data-src={src} />
  ),
}));
vi.mock("@/components/WishlistButton", () => ({
  WishlistButton: () => null,
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.routerPush }),
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
  trackInventory: true,
  tieredDiscountsEnabled: false,
};

beforeEach(() => {
  mocks.addItem.mockClear();
  mocks.routerPush.mockClear();
  mocks.showToast.mockClear();
  window.gtag = vi.fn();
});

describe("ProductDetailExperience", () => {
  it("updates the selected color and main preview image when a swatch is clicked", async () => {
    const user = userEvent.setup();
    render(
      <ProductDetailExperience
        categoryName="Soft Baits"
        images={[]}
        product={product}
        tieredDiscounts={[]}
        variants={[
          {
            id: "variant-white",
            sku: "SHAD-WHITE",
            priceCents: 1200,
            discountPriceCents: null,
            stock: 8,
            size: "4 in",
            color: "White",
            imageUrl: "/river-shad-white.webp",
          },
          {
            id: "variant-green",
            sku: "SHAD-GREEN",
            priceCents: 1200,
            discountPriceCents: null,
            stock: 8,
            size: "4 in",
            color: "Green",
            imageUrl: "/river-shad-green.webp",
          },
        ]}
      />,
    );

    const mainImage = () => screen.getAllByRole("img", { name: "River Shad" })[0];
    const whiteSwatch = screen.getByRole("button", { name: "White" });
    const greenSwatch = screen.getByRole("button", { name: "Green" });

    expect(whiteSwatch).toHaveAttribute("aria-pressed", "true");
    expect(greenSwatch).toHaveAttribute("aria-pressed", "false");
    expect(mainImage()).toHaveAttribute("data-src", "/river-shad-white.webp");

    await user.click(greenSwatch);

    expect(greenSwatch).toHaveAttribute("aria-pressed", "true");
    expect(whiteSwatch).toHaveAttribute("aria-pressed", "false");
    expect(mainImage()).toHaveAttribute("data-src", "/river-shad-green.webp");
  });

  it("adds the selected item and navigates to checkout when Buy Now is clicked", async () => {
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

    const title = screen.getByRole("heading", { level: 1, name: "River Shad" });
    const price = screen.getByText("$12.00");
    const colorSelector = screen.getByRole("group", { name: "Color: Green" });
    const quantity = screen.getByRole("button", { name: "Decrease quantity of item" });
    const buyNow = screen.getByRole("button", { name: "Buy Now" });
    const description = screen.getByText(product.description);
    const precedes = (first: Element, second: Element) =>
      Boolean(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING);

    expect(precedes(title, price)).toBe(true);
    expect(precedes(price, colorSelector)).toBe(true);
    expect(precedes(colorSelector, quantity)).toBe(true);
    expect(precedes(quantity, buyNow)).toBe(true);
    expect(precedes(buyNow, description)).toBe(true);

    expect(screen.queryByText("Ratings (0)")).not.toBeInTheDocument();
    expect(
      screen.queryByText("Price per item after applicable quantity discounts"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Informational estimate: 3 monthly installments/),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Increase quantity of item" }));
    await user.click(screen.getByRole("button", { name: "Buy Now" }));

    expect(mocks.addItem).toHaveBeenCalledWith(
      expect.objectContaining({ name: "River Shad", variantId: "variant-1" }),
      2,
    );
    expect(mocks.routerPush).toHaveBeenCalledWith("/checkout");
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
  });

  it("allows quantities above recorded stock when inventory tracking is disabled", async () => {
    const user = userEvent.setup();
    render(
      <ProductDetailExperience
        categoryName="Soft Baits"
        images={[]}
        product={{ ...product, trackInventory: false }}
        tieredDiscounts={[]}
        variants={[
          {
            id: "variant-untracked",
            sku: "SHAD-UNTRACKED",
            priceCents: 1200,
            discountPriceCents: null,
            stock: 0,
            size: null,
            color: null,
            imageUrl: null,
          },
        ]}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Increase quantity of item" }));
    await user.click(screen.getByRole("button", { name: "Add to Cart" }));

    expect(mocks.addItem).toHaveBeenCalledWith(
      expect.objectContaining({ variantId: "variant-untracked" }),
      2,
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
