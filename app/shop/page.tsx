import Link from "next/link";
import { Suspense } from "react";
import { IconFeature } from "@/components/IconFeature";
import { ProductCard } from "@/components/ProductCard";
import { SortSelect } from "@/components/SortSelect";
import { categories } from "@/lib/categories";
import { prisma } from "@/lib/prisma";

const sortOptions = ["price-asc", "price-desc", "newest"] as const;
type SortOption = (typeof sortOptions)[number];
type ShopSearchParams = { category?: string; sort?: string };

function getSortOption(value: string | undefined): SortOption {
  return sortOptions.includes(value as SortOption) ? (value as SortOption) : "newest";
}

function getCategory(value: string | undefined) {
  return categories.find((category) => category.slug === value);
}

function ProductGridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6 lg:grid-cols-4">
      {Array.from({ length: 8 }, (_, index) => (
        <div key={index} className="animate-pulse overflow-hidden bg-[#e4e4d9]">
          <div className="aspect-[1/1.1] bg-[#c9c9c0]" />
          <div className="grid gap-3 p-5">
            <div className="h-3 w-1/2 bg-[#c9c9c0]" />
            <div className="h-5 w-4/5 bg-[#c9c9c0]" />
            <div className="h-4 w-1/4 bg-[#c9c9c0]" />
          </div>
        </div>
      ))}
    </div>
  );
}

async function ProductGrid({ categoryName, sort }: { categoryName?: string; sort: SortOption }) {
  const products = await prisma.product.findMany({
    where: categoryName ? { category: categoryName } : undefined,
    orderBy:
      sort === "price-asc"
        ? { priceCents: "asc" }
        : sort === "price-desc"
          ? { priceCents: "desc" }
          : { createdAt: "desc" },
    select: {
      slug: true,
      name: true,
      category: true,
      priceCents: true,
      imageUrl: true,
    },
  });

  if (products.length === 0) {
    return (
      <div className="border border-[rgba(241,240,232,.18)] px-6 py-20 text-center">
        <p className="text-xl font-bold uppercase tracking-[-.03em]">
          No products match this category
        </p>
        <Link
          className="mt-6 inline-block border-b border-lime pb-1 text-[.7rem] font-extrabold uppercase tracking-[.12em] text-lime"
          href="/shop"
        >
          View all products ↗
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6 lg:grid-cols-4">
      {products.map((product) => (
        <ProductCard key={product.slug} product={product} />
      ))}
    </div>
  );
}

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<ShopSearchParams>;
}) {
  const params = await searchParams;
  const selectedCategory = getCategory(params.category);
  const sort = getSortOption(params.sort);
  const sortQuery = `sort=${sort}`;

  return (
    <main className="bg-ink px-[7vw] py-16 text-paper md:px-[10vw] md:py-24">
      <section className="mb-12 max-w-3xl md:mb-16">
        <p className="text-[.65rem] font-bold uppercase tracking-[.18em] text-lime">
          The Calypto lineup
        </p>
        <h1 className="my-5 text-[3.8rem] font-black uppercase leading-[.88] tracking-[-.07em] md:text-[clamp(4rem,8vw,8rem)]">
          Find your
          <br />
          <em className="text-lime not-italic">next bite.</em>
        </h1>
        <p className="max-w-xl leading-[1.7] text-muted">
          Purpose-built soft plastics and terminal tackle for the casts that matter.
        </p>
      </section>

      <section className="mb-10 border-y border-[rgba(241,240,232,.18)] py-5">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <nav className="flex flex-wrap gap-x-5 gap-y-3" aria-label="Product categories">
            <Link
              className={`text-[.68rem] font-extrabold uppercase tracking-[.12em] ${selectedCategory ? "text-muted hover:text-paper" : "text-lime"}`}
              href={`/shop?${sortQuery}`}
            >
              All Products
            </Link>
            {categories.map((category) => {
              const isActive = selectedCategory?.slug === category.slug;
              return (
                <Link
                  className={`text-[.68rem] font-extrabold uppercase tracking-[.12em] ${isActive ? "text-lime" : "text-muted hover:text-paper"}`}
                  href={`/shop?category=${category.slug}&${sortQuery}`}
                  key={category.slug}
                >
                  {category.displayName}
                </Link>
              );
            })}
          </nav>
          <SortSelect value={sort} />
        </div>
      </section>

      <Suspense fallback={<ProductGridSkeleton />}>
        <ProductGrid categoryName={selectedCategory?.displayName} sort={sort} />
      </Suspense>

      <section className="mt-20 grid gap-6 border-t border-[rgba(241,240,232,.18)] pt-8 md:grid-cols-3">
        <IconFeature icon="◈" title="Realistic action" text="Motion that gets noticed" />
        <IconFeature icon="◇" title="Durable plastics" text="More bites per bait" />
        <IconFeature icon="↗" title="Fast shipping" text="Worldwide, always" />
      </section>
    </main>
  );
}
