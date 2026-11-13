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
});

describe("ProductCard actions", () => {
  it.each(["Shop", "Wishlist"] as const)(
    "links to the product detail page from the %s list",
    (listName) => {
      render(<ProductCard itemListName={listName} product={product} />);

      const exploreLink = screen.getByRole("link", { name: "View product details for River Shad" });
      expect(exploreLink).toHaveAttribute("href", "/shop/river-shad");
      expect(mocks.addItem).not.toHaveBeenCalled();
    },
  );

  it("keeps quick view available for products with multiple variants", async () => {
    const user = userEvent.setup();
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

    await user.click(screen.getByRole("button", { name: /Quick view/i }));
    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(dialog.parentElement?.parentElement).toBe(document.body);
    expect(screen.getByRole("button", { name: "5 in" })).toBeInTheDocument();
    expect(mocks.addItem).not.toHaveBeenCalled();
  });

  it("does not display color swatches on product cards", () => {
    render(
      <ProductCard
        itemListName="Shop"
        product={{
          ...product,
          variants: [
            product.variants[0]!,
            { ...product.variants[0]!, id: "variant-2", sku: "SHAD-02", color: "White" },
          ],
        }}
      />,
    );

    expect(screen.queryByRole("group", { name: "Available colors" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Choose Green" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Choose White" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Quick view/i })).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "View product details for River Shad" }),
    ).toBeInTheDocument();
  });

  it("links to product details when the variant is out of stock", () => {
    render(
      <ProductCard
        itemListName="Shop"
        product={{
          ...product,
          variants: [{ ...product.variants[0]!, stock: 0 }],
        }}
      />,
    );

    expect(screen.getByRole("link", { name: "View product details for River Shad" })).toHaveAttribute(
      "href",
      "/shop/river-shad",
    );
    expect(mocks.addItem).not.toHaveBeenCalled();
  });

  it("links to product details when inventory tracking is disabled", () => {
    render(
      <ProductCard
        itemListName="Shop"
        product={{
          ...product,
          trackInventory: false,
          variants: [{ ...product.variants[0]!, stock: 0 }],
        }}
      />,
    );

    expect(screen.getByRole("link", { name: "View product details for River Shad" })).toHaveAttribute(
      "href",
      "/shop/river-shad",
    );
    expect(mocks.addItem).not.toHaveBeenCalled();
  });
});
