// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  deleteProduct: vi.fn(),
  refresh: vi.fn(),
  reorderProducts: vi.fn(),
  showToast: vi.fn(),
  updateProduct: vi.fn(),
}));

vi.mock("@/app/admin/catalog-actions", () => ({
  deleteProduct: mocks.deleteProduct,
  reorderProducts: mocks.reorderProducts,
  updateProduct: mocks.updateProduct,
}));
vi.mock("@/components/ToastProvider", () => ({
  useToast: () => ({ showToast: mocks.showToast }),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}));
vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));
vi.mock("next/image", () => ({
  default: () => null,
}));

import {
  AdminProductsTable,
  type CategoryOption,
  type ProductRecord,
} from "@/components/admin/AdminProductsTable";

const categories: CategoryOption[] = [
  { id: "category-1", name: "Soft Baits", tieredDiscountsEnabled: false },
];

function makeProduct(id: string, name: string): ProductRecord {
  return {
    id,
    name,
    slug: id,
    description: "A soft bait.",
    brand: null,
    priceCents: 1299,
    salePriceCents: null,
    originalPriceCents: null,
    saleEndsAt: null,
    tieredDiscountsEnabled: null,
    isActive: true,
    trackInventory: true,
    tags: [],
    pieceLengthInches: 5,
    piecesPerPack: 6,
    packWeightGrams: 55,
    categoryTieredDiscountsEnabled: false,
    imageUrl: "/products/test.jpg",
    images: [],
    variants: [],
    tieredDiscounts: [],
    categoryId: "category-1",
    categoryName: "Soft Baits",
  };
}

const products = [
  makeProduct("river-shad", "River Shad"),
  makeProduct("lake-minnow", "Lake Minnow"),
];

beforeEach(() => {
  vi.clearAllMocks();
  mocks.reorderProducts.mockResolvedValue({ ok: true, message: "Product order saved." });
});

describe("AdminProductsTable product order", () => {
  it("reorders products with the keyboard and saves the full storefront order", async () => {
    render(<AdminProductsTable categories={categories} products={products} />);

    fireEvent.click(screen.getByRole("button", { name: "Reorder storefront" }));
    fireEvent.keyDown(screen.getByRole("button", { name: /Reorder River Shad/ }), {
      key: "ArrowDown",
    });

    const rows = screen.getAllByRole("row");
    expect(within(rows[1]).getByText("Lake Minnow")).toBeInTheDocument();
    expect(within(rows[2]).getByText("River Shad")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Save order" }));
    await waitFor(() => {
      expect(mocks.reorderProducts).toHaveBeenCalledWith([
        { id: "lake-minnow", displayOrder: 0 },
        { id: "river-shad", displayOrder: 1 },
      ]);
    });
    expect(mocks.showToast).toHaveBeenCalledWith("Product order saved.");
    expect(mocks.refresh).toHaveBeenCalled();
  });
});
