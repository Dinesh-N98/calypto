// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

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

describe("ProductCard actions", () => {
  it("links to the product detail page", () => {
    render(<ProductCard product={product} />);

    const exploreLink = screen.getByRole("link", { name: "View product details for River Shad" });
    expect(exploreLink).toHaveAttribute("href", "/shop/river-shad");
    expect(screen.getByRole("link", { name: "View River Shad" })).toHaveAttribute(
      "href",
      "/shop/river-shad",
    );
    expect(screen.getByRole("link", { name: "River Shad" })).toHaveAttribute(
      "href",
      "/shop/river-shad",
    );
    expect(screen.queryByRole("button", { name: /Quick view/i })).not.toBeInTheDocument();
  });

  it("does not display color swatches or a quick view action on product cards", () => {
    render(
      <ProductCard
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
    expect(screen.queryByRole("button", { name: /Quick view/i })).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "View product details for River Shad" }),
    ).toBeInTheDocument();
  });

  it("links to product details when the variant is out of stock", () => {
    render(
      <ProductCard
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
  });

  it("links to product details when inventory tracking is disabled", () => {
    render(
      <ProductCard
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
  });
});
