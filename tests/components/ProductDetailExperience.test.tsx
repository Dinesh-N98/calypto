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
vi.mock("next/image", () => ({
  default: ({ alt }: { alt: string }) => <div role="img" aria-label={alt} />,
}));
vi.mock("@/components/WishlistButton", () => ({
  WishlistButton: () => null,
}));

import { ProductDetailExperience } from "@/components/ProductDetailExperience";

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
});

describe("ProductDetailExperience", () => {
  it("adds the selected item and opens an inquiry when Buy Now is clicked", async () => {
    const user = userEvent.setup();
    render(
      <ProductDetailExperience
        averageRating={0}
        categoryName="Soft Baits"
        images={[]}
        product={product}
        reviewCount={0}
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

    await user.click(screen.getByRole("button", { name: "Buy Now" }));

    expect(mocks.addItem).toHaveBeenCalledWith(
      expect.objectContaining({ name: "River Shad", variantId: "variant-1" }),
      1,
    );
    expect(screen.getByRole("dialog", { name: "Direct Order Inquiry" })).toBeInTheDocument();
  });
});
