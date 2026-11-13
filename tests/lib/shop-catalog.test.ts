import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  categoryFindMany: vi.fn(),
  productFindMany: vi.fn(),
  variantFindMany: vi.fn(),
  reviewGroupBy: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({
  unstable_cache: <Args extends unknown[], Result>(callback: (...args: Args) => Result) => callback,
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    category: { findMany: mocks.categoryFindMany },
    product: { findMany: mocks.productFindMany },
    productVariant: { findMany: mocks.variantFindMany },
    review: { groupBy: mocks.reviewGroupBy },
  },
}));

import { getShopProductsPage, parseShopPage, SHOP_PAGE_SIZE } from "@/lib/shop-catalog";

describe("shop catalog queries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("bounds and validates the requested page number", () => {
    expect(parseShopPage("2")).toBe(2);
    expect(parseShopPage("0")).toBe(1);
    expect(parseShopPage("-3")).toBe(1);
    expect(parseShopPage("999999999")).toBe(1000);
  });

  it("limits the product query and aggregates ratings only for the visible page", async () => {
    mocks.productFindMany.mockResolvedValue(
      Array.from({ length: SHOP_PAGE_SIZE + 1 }, (_, index) => ({
        id: `product-${index}`,
        slug: `product-${index}`,
        name: `Product ${index}`,
        priceCents: 1000,
        salePriceCents: null,
        saleEndsAt: null,
        imageUrl: `/product-${index}.jpg`,
        trackInventory: true,
        images: [],
        variants: [
          {
            id: `variant-${index}`,
            priceCents: 1000,
            discountPriceCents: null,
            imageUrl: null,
          },
        ],
      })),
    );
    mocks.variantFindMany.mockResolvedValue(
      Array.from({ length: SHOP_PAGE_SIZE }, (_, index) => ({
        id: `variant-${index}`,
        stock: 5,
      })),
    );
    mocks.reviewGroupBy.mockResolvedValue([
      {
        productId: "product-0",
        _avg: { rating: 4.5 },
        _count: { _all: 2 },
      },
    ]);

    const result = await getShopProductsPage("lures", 2);

    expect(mocks.productFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { isActive: true, category: { slug: "lures" } },
        skip: SHOP_PAGE_SIZE,
        take: SHOP_PAGE_SIZE + 1,
        orderBy: [{ displayOrder: "asc" }, { createdAt: "desc" }, { id: "asc" }],
      }),
    );
    const productQuery = mocks.productFindMany.mock.calls[0][0];
    expect(productQuery.select).not.toHaveProperty("reviews");
    expect(productQuery.select.images).toMatchObject({ take: 1 });
    expect(productQuery.select.variants.select).not.toHaveProperty("stock");
    expect(result.hasNextPage).toBe(true);
    expect(result.products[0]).toMatchObject({
      id: "product-0",
      averageRating: 4.5,
      reviewCount: 2,
      variants: [{ stock: 5 }],
    });
    expect(result.products).toHaveLength(SHOP_PAGE_SIZE);
    expect(mocks.reviewGroupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        by: ["productId"],
        where: {
          productId: {
            in: Array.from({ length: SHOP_PAGE_SIZE }, (_, index) => `product-${index}`),
          },
        },
      }),
    );
    expect(mocks.variantFindMany).toHaveBeenCalledWith({
      where: {
        id: {
          in: Array.from({ length: SHOP_PAGE_SIZE }, (_, index) => `variant-${index}`),
        },
      },
      select: { id: true, stock: true },
    });
  });

  it("skips the review aggregation when a page has no products", async () => {
    mocks.productFindMany.mockResolvedValue([]);

    const result = await getShopProductsPage(null, 1);

    expect(result).toEqual({ products: [], hasNextPage: false });
    expect(mocks.reviewGroupBy).not.toHaveBeenCalled();
    expect(mocks.variantFindMany).not.toHaveBeenCalled();
  });
});
