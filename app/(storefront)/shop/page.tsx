import Link from "next/link";
import { Suspense } from "react";
import { ArrowUpRight, ShieldCheck, Truck, Waves } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { IconFeature } from "@/components/IconFeature";
import { ProductCard } from "@/components/ProductCard";
import { RevealStagger } from "@/components/RevealStagger";
import { ShopHeaderToolbar } from "@/components/shop/ShopHeaderToolbar";
import { prisma } from "@/lib/prisma";

type SearchParam = string | string[] | undefined;
type ShopSearchParams = {
  category?: SearchParam;
  sort?: SearchParam;
  q?: SearchParam;
  inStock?: SearchParam;
  onSale?: SearchParam;
  minPrice?: SearchParam;
  maxPrice?: SearchParam;
  view?: SearchParam;
};
type SortOption = "newest" | "price-asc" | "price-desc" | "top-rated";

function firstParam(value: SearchParam): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function getSortOption(value: string | undefined): SortOption {
  return value === "price-asc" || value === "price-desc" || value === "top-rated"
    ? value
    : "newest";
}

function parsePrice(value: string | undefined): number | undefined {
  if (!value || !/^\d{1,9}$/.test(value)) return undefined;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : undefined;
}

function ProductGridSkeleton({ compact }: { compact: boolean }) {
  return (
    <div
      className={`grid grid-cols-2 gap-3 md:grid-cols-3 ${compact ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}
      aria-hidden="true"
    >
      {Array.from({ length: 8 }, (_, index) => (
        <div className="animate-pulse overflow-hidden rounded-xl border border-white/10 bg-[#141712]" key={index}>
          <div className="aspect-square bg-[#1a1d17]" />
          <div className="grid gap-2 p-3">
            <div className="h-4 w-4/5 rounded bg-white/10" />
            <div className="h-3 w-1/4 rounded bg-white/10" />
            <div className="h-9 w-full rounded bg-white/10" />
          </div>
        </div>
      ))}
    </div>
  );
}

async function ProductGrid({
  categoryId,
  compact,
  inStockOnly,
  maxPrice,
  minPrice,
  onSaleOnly,
  query,
  sort,
}: {
  categoryId?: string;
  compact: boolean;
  inStockOnly: boolean;
  maxPrice?: number;
  minPrice?: number;
  onSaleOnly: boolean;
  query?: string;
  sort: SortOption;
}) {
  const where: Prisma.ProductWhereInput = {
    isActive: true,
    ...(categoryId ? { categoryId } : {}),
  };
  const conditions: Prisma.ProductWhereInput[] = [];

  if (query) {
    conditions.push({
      OR: [
        { name: { contains: query, mode: "insensitive" } },
        { tags: { has: query } },
        { variants: { some: { color: { contains: query, mode: "insensitive" } } } },
      ],
    });
  }
  if (inStockOnly) {
    conditions.push({
      OR: [{ trackInventory: false }, { variants: { some: { stock: { gt: 0 } } } }],
    });
  }
  if (onSaleOnly) {
    conditions.push({
      OR: [
        { salePriceCents: { not: null } },
        { variants: { some: { discountPriceCents: { not: null } } } },
      ],
    });
  }
  if (minPrice !== undefined || maxPrice !== undefined) {
    const priceRange = {
      ...(minPrice !== undefined ? { gte: minPrice } : {}),
      ...(maxPrice !== undefined ? { lte: maxPrice } : {}),
    };
    conditions.push({
      OR: [
        { priceCents: priceRange },
        { salePriceCents: priceRange },
        {
          variants: {
            some: {
              OR: [{ priceCents: priceRange }, { discountPriceCents: priceRange }],
            },
          },
        },
      ],
    });
  }
  if (conditions.length > 0) where.AND = conditions;

  const products = await prisma.product.findMany({
    where,
    ...(sort === "price-asc"
      ? { orderBy: { priceCents: "asc" as const } }
      : sort === "price-desc"
        ? { orderBy: { priceCents: "desc" as const } }
        : sort === "newest"
          ? { orderBy: { createdAt: "desc" as const } }
          : {}),
    select: {
      id: true,
      slug: true,
      name: true,
      priceCents: true,
      salePriceCents: true,
      saleEndsAt: true,
      imageUrl: true,
      trackInventory: true,
      pieceLengthInches: true,
      packWeightGrams: true,
      piecesPerPack: true,
      category: { select: { name: true } },
      images: {
        orderBy: { order: "asc" },
        select: { url: true, altText: true, order: true },
      },
      reviews: { select: { rating: true } },
      variants: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          sku: true,
          priceCents: true,
          discountPriceCents: true,
          stock: true,
          size: true,
          color: true,
          imageUrl: true,
        },
      },
    },
  });

  if (sort === "top-rated") {
    products.sort((left, right) => {
      const leftRating =
        left.reviews.length > 0
          ? left.reviews.reduce((sum, review) => sum + review.rating, 0) / left.reviews.length
          : 0;
      const rightRating =
        right.reviews.length > 0
          ? right.reviews.reduce((sum, review) => sum + review.rating, 0) / right.reviews.length
          : 0;
      return rightRating - leftRating || right.reviews.length - left.reviews.length;
    });
  }

  if (products.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-[#141712] px-5 py-14 text-center md:px-6 md:py-16">
        <p className="text-lg font-black uppercase tracking-tight md:text-xl">
          No products match these filters
        </p>
        <p className="mt-2 text-sm text-muted">Try another search or clear a filter to keep exploring.</p>
        <Link
          className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-md bg-lime px-4 text-xs font-black uppercase tracking-wide text-ink transition hover:bg-[#b6cf45]"
          href="/shop"
        >
          View all products <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  return (
    <RevealStagger className={`grid grid-cols-2 gap-3 md:grid-cols-3 ${compact ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
      {products.map((product) => {
        const averageRating = product.reviews.length
          ? product.reviews.reduce((sum, review) => sum + review.rating, 0) / product.reviews.length
          : undefined;
        return (
          <ProductCard
            itemListName="Shop"
            key={product.slug}
            product={{
              ...product,
              categoryName: product.category.name,
              averageRating,
              reviewCount: product.reviews.length,
            }}
          />
        );
      })}
    </RevealStagger>
  );
}

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<ShopSearchParams>;
}) {
  const params = await searchParams;
  const categorySlug = firstParam(params.category);
  const sort = getSortOption(firstParam(params.sort));
  const query = firstParam(params.q)?.trim().slice(0, 100) || undefined;
  const minPrice = parsePrice(firstParam(params.minPrice));
  const maxPrice = parsePrice(firstParam(params.maxPrice));
  const compact = firstParam(params.view) !== "large";
  const inStockOnly = firstParam(params.inStock) === "1";
  const onSaleOnly = firstParam(params.onSale) === "1";
  const [categories, totalCount] = await Promise.all([
    prisma.category.findMany({
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        slug: true,
        _count: { select: { products: { where: { isActive: true } } } },
      },
    }),
    prisma.product.count({ where: { isActive: true } }),
  ]);
  const selectedCategory = categories.find((category) => category.slug === categorySlug);

  return (
    <main className="min-h-screen bg-ink px-[5vw] py-7 text-paper sm:px-[7vw] md:py-10">
      <div className="site-container">
        <header className="flex min-h-[160px] flex-col justify-center border-b border-white/10 py-6">
          <nav aria-label="Breadcrumb" className="mb-3 flex items-center gap-2 text-[.62rem] font-bold uppercase tracking-[.14em] text-muted">
            <Link className="transition hover:text-paper" href="/">Home</Link>
            <span aria-hidden="true">/</span>
            <span className="text-lime">Shop</span>
          </nav>
          <p className="text-[.62rem] font-black uppercase tracking-[.18em] text-lime">Built for the next strike</p>
          <h1 className="mt-1 text-[clamp(2rem,7vw,3.8rem)] font-black uppercase leading-[.95] tracking-[-.06em]">
            The Calypto <span className="text-lime">Arsenal</span>
          </h1>
          <p className="mt-2 max-w-xl text-xs leading-relaxed text-muted sm:text-sm">
            Purpose-built soft plastics and terminal tackle for the casts that matter.
          </p>
        </header>

        <Suspense fallback={<div className="my-8 h-32 animate-pulse rounded-xl bg-[#141712]" />}>
          <ShopHeaderToolbar
            key={[
              firstParam(params.q) ?? "",
              firstParam(params.minPrice) ?? "",
              firstParam(params.maxPrice) ?? "",
            ].join(":")}
            categories={categories.map((category) => ({
              name: category.name,
              slug: category.slug,
              count: category._count.products,
            }))}
            totalCount={totalCount}
          />
        </Suspense>

        <Suspense fallback={<ProductGridSkeleton compact={compact} />}>
          <ProductGrid
            categoryId={selectedCategory?.id}
            compact={compact}
            inStockOnly={inStockOnly}
            maxPrice={maxPrice}
            minPrice={minPrice}
            onSaleOnly={onSaleOnly}
            query={query}
            sort={sort}
          />
        </Suspense>

        <RevealStagger className="mt-16 grid gap-5 border-t border-white/10 pt-7 sm:grid-cols-3">
          <IconFeature icon={Waves} title="Realistic action" text="Motion that gets noticed" />
          <IconFeature icon={ShieldCheck} title="Durable plastics" text="More bites per bait" />
          <IconFeature icon={Truck} title="Fast shipping" text="Worldwide, always" />
        </RevealStagger>
      </div>
    </main>
  );
}
