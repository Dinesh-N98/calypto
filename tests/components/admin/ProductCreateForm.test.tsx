// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createProduct: vi.fn(),
  push: vi.fn(),
  refresh: vi.fn(),
  showToast: vi.fn(),
}));

vi.mock("@/app/admin/catalog-actions", () => ({
  createProduct: mocks.createProduct,
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
