// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  deleteProduct: vi.fn(),
  push: vi.fn(),
  reorderProducts: vi.fn(),
  refresh: vi.fn(),
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
  useRouter: () => ({ push: mocks.push, refresh: mocks.refresh }),
}));
vi.mock("next/image", () => ({
  default: ({ alt }: { alt: string }) => <div role="img" aria-label={alt} />,
}));

import {
  ProductEditForm,
  type CategoryOption,
  type ProductRecord,
} from "@/components/admin/AdminProductsTable";

const categories: CategoryOption[] = [
  { id: "category-1", name: "Soft Baits", tieredDiscountsEnabled: true },
];

const product: ProductRecord = {
  id: "product-1",
  name: "River Shad",
  slug: "river-shad",
  description: "A versatile lure.",
  brand: "Calypto",
  priceCents: 1299,
  salePriceCents: null,
  originalPriceCents: null,
  saleEndsAt: null,
  tieredDiscountsEnabled: null,
  isActive: true,
  trackInventory: true,
  tags: ["river"],
  pieceLengthInches: 5,
  piecesPerPack: 6,
  packWeightGrams: 55,
  categoryTieredDiscountsEnabled: true,
  imageUrl: "/products/river-shad.jpg",
  images: [],
  variants: [
    {
      sku: "RIVER-SHAD",
      size: null,
      color: null,
      priceCents: 1299,
      discountPriceCents: null,
      stock: 12,
      imageUrl: null,
      weightKg: null,
      lengthCm: null,
      widthCm: null,
      heightCm: null,
    },
  ],
  tieredDiscounts: [],
  categoryId: "category-1",
  categoryName: "Soft Baits",
};

describe("ProductEditForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders a full-page edit form with the product values and grouped cards", () => {
    render(<ProductEditForm categories={categories} product={product} />);

    expect(screen.getByRole("heading", { name: "Edit River Shad" })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Breadcrumb" })).toHaveTextContent(
      /Products\s*\/\s*Edit product/u,
    );
    expect(screen.getByRole("heading", { name: "General information" })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Physical & shipping specifications" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Pricing & discounts" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Product organization" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Inventory & settings" })).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Product name")).toHaveValue("River Shad");
    expect(screen.getByLabelText("URL slug")).toHaveValue("river-shad");
    expect(screen.getByLabelText(/Price \(USD\)/u)).toHaveValue(12.99);
    expect(screen.getAllByRole("link", { name: "Cancel" })[0]).toHaveAttribute(
      "href",
      "/admin/products",
    );
  });

  it("submits existing product details and returns to the catalog after saving", async () => {
    mocks.updateProduct.mockResolvedValue({ ok: true, message: "Product updated." });
    render(<ProductEditForm categories={categories} product={product} />);

    fireEvent.submit(document.getElementById("product-edit-form")!);

    await waitFor(() => expect(mocks.updateProduct).toHaveBeenCalledOnce());
    const formData = mocks.updateProduct.mock.calls[0][0] as FormData;
    expect(formData.get("id")).toBe(product.id);
    expect(formData.get("name")).toBe(product.name);
    expect(formData.get("imageUrl")).toBe(product.imageUrl);
    expect(formData.getAll("defaultStock")).toHaveLength(1);
    expect(JSON.parse(String(formData.get("variants")))).toMatchObject([
      { sku: "RIVER-SHAD", price: "12.99", stock: 12 },
    ]);
    expect(mocks.push).toHaveBeenCalledWith("/admin/products");
    expect(mocks.showToast).toHaveBeenCalledWith("Product updated.");
  });

  it("shows inline validation errors before updating an invalid product", () => {
    render(<ProductEditForm categories={categories} product={product} />);
    fireEvent.change(screen.getByLabelText("Product name"), { target: { value: "" } });
    fireEvent.submit(document.getElementById("product-edit-form")!);

    expect(screen.getByText("Enter a product name.")).toBeInTheDocument();
    expect(mocks.updateProduct).not.toHaveBeenCalled();
  });
});
