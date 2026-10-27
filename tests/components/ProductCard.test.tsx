// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
vi.mock("@/components/WishlistButton", () => ({
  WishlistButton: () => null,
}));
vi.mock("next/image", () => ({
  default: ({ alt }: { alt: string }) => <div role="img" aria-label={alt} />,
}));

import { ProductCard } from "@/components/ProductCard";

const product = {
  id: "product-1",
  slug: "river-shad",
  name: "River Shad",
  priceCents: 1200,
  imageUrl: "/river-shad.webp",
  variants: [
    {
      id: "variant-1",
      sku: "SHAD-01",
      priceCents: 1250,
      stock: 5,
      size: "4 in",
      color: "Green",
      imageUrl: null,
    },
  ],
};

beforeEach(() => {
  mocks.addItem.mockClear();
  mocks.showToast.mockClear();
  window.gtag = vi.fn();
});

describe("ProductCard cart actions", () => {
  it.each(["Shop", "Wishlist"] as const)(
    "tracks each single-variant quick-add from the %s list",
    async (listName) => {
      const user = userEvent.setup();
      render(<ProductCard itemListName={listName} product={product} />);

      const addButton = screen.getByRole("button", { name: /Add to Cart/i });
      await user.click(addButton);
      await user.click(addButton);

      expect(mocks.addItem).toHaveBeenCalledTimes(2);
      expect(mocks.addItem).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ variantId: "variant-1", sku: "SHAD-01", priceCents: 1250 }),
        1,
      );
      expect(window.gtag).toHaveBeenCalledTimes(2);
      expect(window.gtag).toHaveBeenNthCalledWith(
        1,
        "event",
        "add_to_cart",
        expect.objectContaining({
          currency: "USD",
          value: 12.5,
          items: [
            expect.objectContaining({
              item_id: "SHAD-01",
              item_variant: "Green / 4 in",
              item_list_name: listName,
              price: 12.5,
              quantity: 1,
            }),
          ],
        }),
      );
    },
  );

  it("offers Select options for multiple variants without adding any to the cart", () => {
    render(
      <ProductCard
        itemListName="Shop"
        product={{
          ...product,
          variants: [
            product.variants[0]!,
            { ...product.variants[0]!, id: "variant-2", sku: "SHAD-02", size: "5 in" },
          ],
        }}
      />,
    );

    const optionsLink = screen.getByRole("link", { name: "Select options" });
    expect(optionsLink).toHaveAttribute("href", "/shop/river-shad");
    expect(mocks.addItem).not.toHaveBeenCalled();
    expect(window.gtag).not.toHaveBeenCalled();
  });

  it("keeps the no-stock action and does not send an event", () => {
    render(
      <ProductCard
        itemListName="Shop"
        product={{
          ...product,
          variants: [{ ...product.variants[0]!, stock: 0 }],
        }}
      />,
    );

    expect(screen.getByRole("link", { name: "Out of Stock" })).toHaveAttribute(
      "href",
      "/shop/river-shad",
    );
    expect(mocks.addItem).not.toHaveBeenCalled();
    expect(window.gtag).not.toHaveBeenCalled();
  });

  it("still adds to the cart without gtag", async () => {
    window.gtag = undefined;
    const user = userEvent.setup();
    render(<ProductCard itemListName="Shop" product={product} />);

    await user.click(screen.getByRole("button", { name: /Add to Cart/i }));

    expect(mocks.addItem).toHaveBeenCalledTimes(1);
    expect(mocks.showToast).toHaveBeenCalledOnce();
  });
});
