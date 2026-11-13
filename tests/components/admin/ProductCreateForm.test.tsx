// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createProduct: vi.fn(),
  push: vi.fn(),
  reorderProducts: vi.fn(),
  refresh: vi.fn(),
  showToast: vi.fn(),
}));

vi.mock("@/app/admin/catalog-actions", () => ({
  createProduct: mocks.createProduct,
  reorderProducts: mocks.reorderProducts,
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

import { ProductCreateForm } from "@/components/admin/ProductCreateForm";
import { ProductVariantBuilder, type VariantValue } from "@/components/admin/ProductVisualFields";

const categories = [{ id: "category-1", name: "Soft Baits", tieredDiscountsEnabled: true }];

describe("ProductCreateForm", () => {
  it("renders the full-page sections and auto-generates an editable URL slug", async () => {
    const user = userEvent.setup();
    render(<ProductCreateForm categories={categories} />);

    expect(screen.getByRole("navigation", { name: "Breadcrumb" })).toHaveTextContent(
      /Products\/Create product/u,
    );
    expect(screen.getByRole("heading", { name: "General information" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Media & assets" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Pricing & discounts" })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Physical & shipping specifications" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Product organization" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Inventory & settings" })).toBeInTheDocument();
    expect(screen.getByLabelText("Piece length")).toHaveValue(5);
    expect(screen.getByLabelText("Pieces per pack")).toHaveValue(6);
    expect(screen.getByLabelText("Pack weight")).toHaveValue(55);

    await user.type(screen.getByLabelText("Product name"), "River Shad");
    const slug = screen.getByLabelText("URL slug");
    expect(slug).toHaveValue("river-shad");

    await user.clear(slug);
    await user.type(slug, "custom-slug");
    await user.clear(screen.getByLabelText("Product name"));
    await user.type(screen.getByLabelText("Product name"), "New Name");
    expect(slug).toHaveValue("custom-slug");
  });

  it("shows inline field errors and does not submit an invalid product", () => {
    render(<ProductCreateForm categories={categories} />);
    const form = document.getElementById("product-create-form");
    expect(form).not.toBeNull();
    fireEvent.submit(form!);

    expect(screen.getByText("Enter a product name.")).toBeInTheDocument();
    expect(mocks.createProduct).not.toHaveBeenCalled();
  });

  it("keeps sale price and discount amount mutually exclusive and updates the savings preview", () => {
    render(<ProductCreateForm categories={categories} />);

    fireEvent.change(screen.getByLabelText("Base price (USD)"), { target: { value: "10" } });
    const salePrice = screen.getByLabelText("Sale price (USD)");
    const discountAmount = screen.getByLabelText("Discount amount (USD)");

    fireEvent.change(salePrice, { target: { value: "8" } });
    expect(salePrice).toHaveValue(8);
    expect(discountAmount).toHaveValue(null);

    fireEvent.change(discountAmount, { target: { value: "2" } });
    expect(discountAmount).toHaveValue(2);
    expect(salePrice).toHaveValue(null);
    expect(screen.getByText(/Effective sale price: \$8\.00 · You save 20%\./u)).toBeInTheDocument();
  });

  it("builds variants, discount tiers, and tags with visual controls", async () => {
    const user = userEvent.setup();
    const { container } = render(<ProductCreateForm categories={categories} />);

    await user.click(screen.getByRole("button", { name: "Add variant" }));
    await user.type(screen.getByLabelText("Variant title"), "Green");
    await user.type(screen.getByLabelText(/SKU/u), "GREEN-01");
    const variantsInput = container.querySelector<HTMLInputElement>('input[name="variants"]');
    expect(JSON.parse(variantsInput!.value)).toMatchObject([{ title: "Green", sku: "GREEN-01" }]);

    await user.click(screen.getByRole("button", { name: "Add discount tier" }));
    await user.type(screen.getByLabelText("Minimum quantity"), "10");
    await user.type(screen.getByLabelText("Discount (%)"), "15");
    const discountsInput = container.querySelector<HTMLInputElement>(
      'input[name="tieredDiscounts"]',
    );
    expect(JSON.parse(discountsInput!.value)).toEqual([
      { minQuantity: "10", discountPercentage: "15" },
    ]);

    await user.type(screen.getByLabelText("Add tag"), "river{Enter}");
    const tagsInput = container.querySelector<HTMLInputElement>('input[name="tags"]');
    expect(tagsInput).toHaveValue("river");
    expect(screen.getByText("river")).toBeInTheDocument();
  });
});

describe("ProductVariantBuilder reordering", () => {
  it("moves the focused variant down with ArrowDown and updates its position label", () => {
    const variants: VariantValue[] = [
      {
        title: "Green",
        sku: "GREEN",
        size: "",
        color: "",
        price: "10",
        discountPrice: "",
        stock: "0",
        imageUrl: "",
        weightKg: "",
        lengthCm: "",
        widthCm: "",
        heightCm: "",
      },
      {
        title: "Blue",
        sku: "BLUE",
        size: "",
        color: "",
        price: "10",
        discountPrice: "",
        stock: "0",
        imageUrl: "",
        weightKg: "",
        lengthCm: "",
        widthCm: "",
        heightCm: "",
      },
    ];
    const { container } = render(<ProductVariantBuilder initialVariants={variants} />);

    fireEvent.keyDown(screen.getByRole("button", { name: "Drag to reorder variant 1" }), {
      key: "ArrowDown",
    });

    const firstVariant = screen.getByRole("group", { name: "Variant 1" });
    const secondVariant = screen.getByRole("group", { name: "Variant 2" });
    expect(firstVariant).toContainElement(screen.getByDisplayValue("Blue"));
    expect(secondVariant).toContainElement(screen.getByDisplayValue("Green"));
    expect(
      JSON.parse(container.querySelector<HTMLInputElement>('input[name="variants"]')!.value).map(
        (variant: { title: string }) => variant.title,
      ),
    ).toEqual(["Blue", "Green"]);
  });

  it("uploads a dropped image and saves its URL to the variant image path", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ imageUrl: "/api/product-images/products/variant.png" }),
    } as Response);
    const variant: VariantValue = {
      title: "Green",
      sku: "GREEN",
      size: "",
      color: "",
      price: "10",
      discountPrice: "",
      stock: "0",
      imageUrl: "",
      weightKg: "",
      lengthCm: "",
      widthCm: "",
      heightCm: "",
    };
    const { container } = render(<ProductVariantBuilder initialVariants={[variant]} />);

    fireEvent.drop(screen.getByLabelText(/Image path/u), {
      dataTransfer: { files: [new File(["image"], "variant.png", { type: "image/png" })] },
    });

    await waitFor(() =>
      expect(screen.getByLabelText(/Image path/u)).toHaveValue(
        "/api/product-images/products/variant.png",
      ),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/product-images",
      expect.objectContaining({ method: "POST" }),
    );
    expect(
      JSON.parse(container.querySelector<HTMLInputElement>('input[name="variants"]')!.value)[0]
        .imageUrl,
    ).toBe("/api/product-images/products/variant.png");
    fetchMock.mockRestore();
  });
});
