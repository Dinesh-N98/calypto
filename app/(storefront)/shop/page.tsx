import Link from "next/link";
import { Suspense } from "react";
import { ArrowUpRight, ShieldCheck, Truck, Waves } from "lucide-react";
import { IconFeature } from "@/components/IconFeature";
import { ProductCard } from "@/components/ProductCard";
import { RevealStagger } from "@/components/RevealStagger";
import { ShopHeaderToolbar } from "@/components/shop/ShopHeaderToolbar";
import {
  getShopCategories,
  getShopProductsPage,
  parseShopPage,
  SHOP_PAGE_SIZE,
} from "@/lib/shop-catalog";

type SearchParam = string | string[] | undefined;
type ShopSearchParams = {
  category?: SearchParam;
  page?: SearchParam;
};

function firstParam(value: SearchParam): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function ProductGridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4" aria-hidden="true">
      {Array.from({ length: SHOP_PAGE_SIZE }, (_, index) => (
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
  categorySlug,
  page,
}: {
  categorySlug: string | null;
  page: number;
}) {
  const { products, hasNextPage } = await getShopProductsPage(categorySlug, page);

  if (products.length === 0) {
    return (
      <>
        <div className="rounded-xl border border-white/10 bg-[#141712] px-5 py-14 text-center md:px-6 md:py-16">
          <p className="text-lg font-black uppercase tracking-tight md:text-xl">
            No products match these filters
          </p>
          <p className="mt-2 text-sm text-muted">Choose another category to keep exploring.</p>
          <Link
            className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-md bg-lime px-4 text-xs font-black uppercase tracking-wide text-ink transition hover:bg-[#b6cf45]"
            href="/shop"
          >
            View all products <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        </div>
        {page > 1 && <ShopPagination categorySlug={categorySlug} page={page} hasNextPage={false} />}
      </>
    );
  }

  return (
    <>
      <RevealStagger className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        {products.map((product) => (
          <ProductCard key={product.slug} product={product} />
        ))}
      </RevealStagger>
      <ShopPagination categorySlug={categorySlug} page={page} hasNextPage={hasNextPage} />
    </>
  );
}

function ShopPagination({
  categorySlug,
  page,
  hasNextPage,
}: {
  categorySlug: string | null;
  page: number;
  hasNextPage: boolean;
}) {
  function pageHref(targetPage: number) {
    const params = new URLSearchParams();
    if (categorySlug) params.set("category", categorySlug);
    if (targetPage > 1) params.set("page", String(targetPage));
    const query = params.toString();
    return query ? `/shop?${query}` : "/shop";
  }

  if (page === 1 && !hasNextPage) return null;

  return (
    <nav aria-label="Shop pages" className="mt-8 flex items-center justify-center gap-4">
      {page > 1 ? (
        <Link
          className="inline-flex min-h-11 items-center rounded-md border border-white/20 px-4 text-xs font-black uppercase tracking-wide transition hover:border-lime hover:text-lime"
          href={pageHref(page - 1)}
        >
          Previous
        </Link>
      ) : (
        <span aria-hidden="true" className="min-h-11 px-4" />
      )}
      <span aria-current="page" className="text-sm text-muted">
        Page {page}
      </span>
      {hasNextPage ? (
        <Link
          className="inline-flex min-h-11 items-center rounded-md border border-white/20 px-4 text-xs font-black uppercase tracking-wide transition hover:border-lime hover:text-lime"
          href={pageHref(page + 1)}
        >
          Next
        </Link>
      ) : (
        <span aria-hidden="true" className="min-h-11 px-4" />
      )}
    </nav>
  );
}

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<ShopSearchParams>;
}) {
  const params = await searchParams;
  const categorySlug = firstParam(params.category);
  const page = parseShopPage(firstParam(params.page));
  const categories = await getShopCategories();
  const selectedCategory = categories.find((category) => category.slug === categorySlug);

  return (
    <main className="min-h-screen bg-ink px-[5vw] pt-6 pb-7 text-paper sm:px-[7vw] md:pt-8 md:pb-10">
      <div className="site-container">
        <header className="mb-6 flex w-full items-center justify-between py-4">
          <nav aria-label="Breadcrumb" className="flex min-w-0 flex-1 items-center gap-2 truncate pr-3 text-[.62rem] font-bold uppercase tracking-[.14em] text-muted">
            <Link className="shrink-0 transition hover:text-paper" href="/">Home</Link>
            <span aria-hidden="true" className="shrink-0">/</span>
            {selectedCategory ? (
              <>
                <Link className="shrink-0 transition hover:text-paper" href="/shop">Shop</Link>
                <span aria-hidden="true" className="shrink-0">/</span>
                <span className="min-w-0 truncate text-lime">{selectedCategory.name}</span>
              </>
            ) : (
              <span className="truncate text-lime">Shop</span>
            )}
          </nav>
          <div className="shrink-0">
            <Suspense fallback={<div aria-hidden="true" className="h-8 w-32 md:h-9 md:w-36" />}>
              <ShopHeaderToolbar
                categories={categories.map((category) => ({
                  name: category.name,
                  slug: category.slug,
                }))}
              />
            </Suspense>
          </div>
        </header>

        <Suspense fallback={<ProductGridSkeleton />}>
          <ProductGrid categorySlug={selectedCategory?.slug ?? null} page={page} />
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
