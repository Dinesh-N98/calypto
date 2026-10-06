import Link from "next/link";
import { Suspense } from "react";
import { ArrowUpRight, ShieldCheck, Truck, Waves } from "lucide-react";
import { IconFeature } from "@/components/IconFeature";
import { ProductCard } from "@/components/ProductCard";
import { Reveal } from "@/components/Reveal";
import { RevealStagger } from "@/components/RevealStagger";
import { SortSelect } from "@/components/SortSelect";
import { prisma } from "@/lib/prisma";

const sortOptions = ["price-asc", "price-desc", "newest"] as const;
type SortOption = (typeof sortOptions)[number];
type ShopSearchParams = { category?: string; sort?: string };

function getSortOption(value: string | undefined): SortOption {
  return sortOptions.includes(value as SortOption) ? (value as SortOption) : "newest";
}

function ProductGridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-3 md:gap-3 lg:grid-cols-4">
      {Array.from({ length: 8 }, (_, index) => (
        <div key={index} className="animate-pulse overflow-hidden bg-[#e4e4d9]">
          <div className="aspect-square bg-[#c9c9c0]" />
          <div className="grid gap-1 p-2">
            <div className="h-4 w-4/5 bg-[#c9c9c0]" />
            <div className="h-3 w-1/4 bg-[#c9c9c0]" />
            <div className="h-7 w-full bg-[#c9c9c0]" />
          </div>
        </div>
      ))}
    </div>
  );
}

async function ProductGrid({ categoryId, sort }: { categoryId?: string; sort: SortOption }) {
  const products = await prisma.product.findMany({
    where: categoryId ? { categoryId } : undefined,
    orderBy:
      sort === "price-asc"
        ? { priceCents: "asc" }
        : sort === "price-desc"
          ? { priceCents: "desc" }
          : { createdAt: "desc" },
    select: {
      slug: true,
      name: true,
      priceCents: true,
      imageUrl: true,
    },
  });

  if (products.length === 0) {
    return (
      <div className="border border-[rgba(241,240,232,.18)] px-5 py-14 text-center md:px-6 md:py-16">
        <p className="text-lg font-bold uppercase tracking-[-.03em] md:text-xl">
          No products match this category
        </p>
        <Link
          className="group link-underline mt-6 inline-flex items-center gap-1.5 pb-1 text-[.7rem] font-extrabold uppercase tracking-[.12em] text-lime"
          href="/shop"
        >
          View all products{" "}
          <span className="transition-transform duration-300 group-hover:translate-x-1 motion-reduce:transform-none">
            <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
          </span>
        </Link>
      </div>
    );
  }

  return (
    <RevealStagger className="grid grid-cols-2 gap-2 md:grid-cols-3 md:gap-3 lg:grid-cols-4">
      {products.map((product) => (
        <ProductCard key={product.slug} product={product} />
      ))}
    </RevealStagger>
  );
}

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<ShopSearchParams>;
}) {
  const params = await searchParams;
  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, slug: true },
  });
  const selectedCategory = categories.find((category) => category.slug === params.category);
  const sort = getSortOption(params.sort);
  const sortQuery = `sort=${sort}`;

  return (
    <main className="bg-ink px-[7vw] py-12 text-paper md:px-[10vw] md:py-20">
      <div className="site-container">
        <Reveal as="section" className="mb-9 max-w-3xl md:mb-12">
          <p className="text-[.6rem] font-bold uppercase tracking-[.15em] text-lime">
            The Calypto lineup
          </p>
          <h1 className="my-4 text-[clamp(2.65rem,9vw,3.8rem)] font-black uppercase leading-[.92] tracking-[-.07em] md:my-5 md:text-[clamp(3.5rem,6vw,6rem)]">
            Find your
            <br />
            <em className="text-lime not-italic">next bite.</em>
          </h1>
          <p className="max-w-xl text-[.9rem] leading-[1.55] text-muted md:text-base md:leading-[1.7]">
            Purpose-built soft plastics and terminal tackle for the casts that matter.
          </p>
        </Reveal>

        <Reveal as="section" className="mb-8 border-y border-[rgba(241,240,232,.18)] py-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
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
                    {category.name}
                  </Link>
                );
              })}
            </nav>
            <SortSelect value={sort} />
          </div>
        </Reveal>

        <Suspense fallback={<ProductGridSkeleton />}>
          <ProductGrid categoryId={selectedCategory?.id} sort={sort} />
        </Suspense>

        <RevealStagger className="mt-20 grid gap-6 border-t border-[rgba(241,240,232,.18)] pt-8 md:grid-cols-3">
          <IconFeature icon={Waves} title="Realistic action" text="Motion that gets noticed" />
          <IconFeature icon={ShieldCheck} title="Durable plastics" text="More bites per bait" />
          <IconFeature icon={Truck} title="Fast shipping" text="Worldwide, always" />
        </RevealStagger>
      </div>
    </main>
  );
}
