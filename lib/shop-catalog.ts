import "server-only";

import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";

export const SHOP_PAGE_SIZE = 12;
const MAX_SHOP_PAGE = 1000;
const SHOP_CATALOG_REVALIDATE_SECONDS = 300;
export const SHOP_CATEGORIES_CACHE_TAG = "shop-categories";
export const SHOP_PRODUCTS_CACHE_TAG = "shop-products";

export function parseShopPage(value: string | undefined): number {
  if (!value || !/^[1-9]\d*$/.test(value)) return 1;
  const page = Number(value);
  return Number.isSafeInteger(page) ? Math.min(page, MAX_SHOP_PAGE) : 1;
}

const getCachedShopCategories = unstable_cache(
  async () =>
    prisma.category.findMany({
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        slug: true,
      },
    }),
  ["shop-categories-v1"],
  {
    revalidate: SHOP_CATALOG_REVALIDATE_SECONDS,
    tags: [SHOP_CATEGORIES_CACHE_TAG],
  },
);

export function getShopCategories() {
  return getCachedShopCategories();
}

const getCachedShopProductsPage = unstable_cache(
  async (categorySlug: string | null, page: number) => {
    const where = {
      isActive: true,
      ...(categorySlug ? { category: { slug: categorySlug } } : {}),
    };

    const rows = await prisma.product.findMany({
      where,
      orderBy: [{ displayOrder: "asc" }, { createdAt: "desc" }, { id: "asc" }],
      skip: (page - 1) * SHOP_PAGE_SIZE,
      take: SHOP_PAGE_SIZE + 1,
      select: {
        id: true,
        slug: true,
        name: true,
        priceCents: true,
        salePriceCents: true,
        saleEndsAt: true,
        imageUrl: true,
        trackInventory: true,
        images: {
          orderBy: { order: "asc" },
          take: 1,
          select: { url: true, altText: true },
        },
        variants: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            priceCents: true,
            discountPriceCents: true,
            imageUrl: true,
          },
        },
      },
    });

    const hasNextPage = page < MAX_SHOP_PAGE && rows.length > SHOP_PAGE_SIZE;
    const products = rows.slice(0, SHOP_PAGE_SIZE);
    const ratings = products.length
      ? await prisma.review.groupBy({
          by: ["productId"],
          where: { productId: { in: products.map(({ id }) => id) } },
          _avg: { rating: true },
          _count: { _all: true },
        })
      : [];
    const ratingByProductId = new Map(
      ratings.map(({ productId, _avg, _count }) => [
        productId,
        { averageRating: _avg.rating ?? undefined, reviewCount: _count._all },
      ]),
    );

    return {
      products: products.map((product) => ({
        ...product,
        ...ratingByProductId.get(product.id),
      })),
      hasNextPage,
    };
  },
  ["shop-products-v1"],
  {
    revalidate: SHOP_CATALOG_REVALIDATE_SECONDS,
    tags: [SHOP_PRODUCTS_CACHE_TAG],
  },
);

export function getShopProductsPage(categorySlug: string | null, page: number) {
  return getCachedShopProductsPage(categorySlug, parseShopPage(String(page))).then(
    async (cachedPage) => {
      const variantIds = cachedPage.products.flatMap((product) =>
        product.variants.map(({ id }) => id),
      );
      const stockRows = variantIds.length
        ? await prisma.productVariant.findMany({
            where: { id: { in: variantIds } },
            select: { id: true, stock: true },
          })
        : [];
      const stockByVariantId = new Map(stockRows.map(({ id, stock }) => [id, stock]));

      return {
        ...cachedPage,
        products: cachedPage.products.map((product) => ({
          ...product,
          variants: product.variants.map((variant) => ({
            ...variant,
            stock: stockByVariantId.get(variant.id) ?? 0,
          })),
        })),
      };
    },
  );
}
