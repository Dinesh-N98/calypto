// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminCategoriesTable } from "@/components/admin/AdminCategoriesTable";

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
  showToast: vi.fn(),
  reorderCategories: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push, refresh: mocks.refresh }),
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
vi.mock("@/components/ToastProvider", () => ({
  useToast: () => ({ showToast: mocks.showToast }),
}));
vi.mock("@/app/admin/catalog-actions", () => ({
  createCategory: vi.fn(),
  deleteCategory: vi.fn(),
  reorderCategories: mocks.reorderCategories,
  updateCategory: vi.fn(),
}));

const categories = [
  {
    id: "category-a",
    name: "Bass",
    slug: "bass",
    image: null,
    displayOrder: 0,
    tieredDiscountsEnabled: false,
    productCount: 1,
  },
  {
    id: "category-b",
    name: "Trout",
    slug: "trout",
    image: null,
    displayOrder: 1,
    tieredDiscountsEnabled: false,
    productCount: 0,
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  mocks.reorderCategories.mockResolvedValue({ ok: true, message: "Category order saved." });
});

describe("AdminCategoriesTable category order", () => {
  it("persists keyboard reordering and updates the displayed rows", async () => {
    render(<AdminCategoriesTable categories={categories} />);

    fireEvent.keyDown(screen.getByRole("button", { name: /Reorder Trout/ }), {
      key: "ArrowUp",
    });

    await waitFor(() => {
      expect(mocks.reorderCategories).toHaveBeenCalledWith([
        { id: "category-b", displayOrder: 0 },
        { id: "category-a", displayOrder: 1 },
      ]);
    });
    await waitFor(() => expect(mocks.refresh).toHaveBeenCalled());
    const rows = screen.getAllByRole("row");
    expect(within(rows[1]).getByText("Trout")).toBeInTheDocument();
    expect(within(rows[2]).getByText("Bass")).toBeInTheDocument();
    expect(mocks.showToast).toHaveBeenCalledWith("Category order saved.");
  });

  it("disables reordering while a category search is active", async () => {
    render(<AdminCategoriesTable categories={categories} />);
    fireEvent.change(screen.getByRole("searchbox", { name: "Search categories" }), {
      target: { value: "bass" },
    });

    expect(screen.getByRole("button", { name: /Reorder Bass/ })).toBeDisabled();
    expect(screen.queryByRole("button", { name: /Reorder Trout/ })).not.toBeInTheDocument();
  });

  it("restores the previous order and reports a failed save", async () => {
    mocks.reorderCategories.mockResolvedValueOnce({
      ok: false,
      error: "The category list changed. Refresh the page and try again.",
    });
    render(<AdminCategoriesTable categories={categories} />);

    fireEvent.keyDown(screen.getByRole("button", { name: /Reorder Trout/ }), {
      key: "ArrowUp",
    });

    await waitFor(() => {
      expect(mocks.showToast).toHaveBeenCalledWith(
        "The category list changed. Refresh the page and try again.",
        "error",
      );
    });
    const rows = screen.getAllByRole("row");
    expect(within(rows[1]).getByText("Bass")).toBeInTheDocument();
    expect(within(rows[2]).getByText("Trout")).toBeInTheDocument();
    expect(mocks.refresh).not.toHaveBeenCalled();
  });
});
