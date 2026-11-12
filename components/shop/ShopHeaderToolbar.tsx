"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Check, ChevronDown, Search } from "lucide-react";

type Category = { name: string; slug: string; count: number };
type SortOption = "newest" | "price-asc" | "price-desc";

const sortOptions: { value: SortOption; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
];

export function ShopHeaderToolbar({
  categories,
  totalCount,
}: {
  categories: Category[];
  totalCount: number;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const paramsString = searchParams.toString();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams(paramsString);
      const value = query.trim();
      if (value) params.set("q", value);
      else params.delete("q");
      const next = params.toString();
      if (next !== paramsString) router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false });
    }, 300);
    return () => window.clearTimeout(timer);
  }, [pathname, paramsString, query, router]);

  function updateParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    const next = params.toString();
    router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false });
  }

  const activeCategory = searchParams.get("category");
  const sort = (searchParams.get("sort") as SortOption | null) ?? "newest";
  const inStockOnly = searchParams.get("inStock") === "1";
  const onSaleOnly = searchParams.get("onSale") === "1";

  return (
    <section className="mb-8 space-y-5 border-y border-white/10 py-5 md:mb-10 md:py-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <nav className="flex flex-wrap gap-2" aria-label="Product categories">
          <CategoryPill
            active={!activeCategory}
            count={totalCount}
            label="All gear"
            onClick={() => updateParam("category", null)}
          />
          {categories.map((category) => (
            <CategoryPill
              active={activeCategory === category.slug}
              count={category.count}
              key={category.slug}
              label={category.name}
              onClick={() =>
                updateParam("category", activeCategory === category.slug ? null : category.slug)
              }
            />
          ))}
        </nav>
        <label className="relative block w-full lg:max-w-xs">
          <Search aria-hidden="true" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            aria-label="Search products by name, tag, or color"
            className="h-11 w-full rounded-md border border-white/10 bg-white/5 pl-10 pr-3 text-sm text-paper outline-none transition placeholder:text-muted/70 focus:border-lime/60 focus:ring-2 focus:ring-lime/15"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search bait, color, or tag"
            type="search"
            value={query}
          />
        </label>
      </div>

      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <button
            aria-pressed={inStockOnly}
            className={`inline-flex min-h-10 items-center gap-2 rounded-full border px-3 text-xs font-bold uppercase tracking-wide transition ${inStockOnly ? "border-lime/40 bg-lime/10 text-lime" : "border-white/10 bg-white/5 text-muted hover:border-white/25 hover:text-paper"}`}
            onClick={() => updateParam("inStock", inStockOnly ? null : "1")}
            type="button"
          >
            {inStockOnly && <Check aria-hidden="true" className="h-3.5 w-3.5" />}
            In stock only
          </button>
          <button
            aria-pressed={onSaleOnly}
            className={`inline-flex min-h-10 items-center gap-2 rounded-full border px-3 text-xs font-bold uppercase tracking-wide transition ${onSaleOnly ? "border-lime/40 bg-lime/10 text-lime" : "border-white/10 bg-white/5 text-muted hover:border-white/25 hover:text-paper"}`}
            onClick={() => updateParam("onSale", onSaleOnly ? null : "1")}
            type="button"
          >
            {onSaleOnly && <Check aria-hidden="true" className="h-3.5 w-3.5" />}
            On sale
          </button>

        </div>

        <div className="flex items-center xl:justify-end">
          <label className="relative flex items-center">
            <span className="sr-only">Sort products</span>
            <select
              aria-label="Sort products"
              className="h-10 appearance-none rounded-md border border-white/10 bg-[#141712] py-2 pl-3 pr-9 text-xs font-bold uppercase tracking-wide text-paper outline-none focus:border-lime/60"
              onChange={(event) => updateParam("sort", event.target.value)}
              value={sortOptions.some((option) => option.value === sort) ? sort : "newest"}
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3 h-3.5 w-3.5 text-muted" />
          </label>
        </div>
      </div>
    </section>
  );
}

function CategoryPill({
  active,
  count,
  label,
  onClick,
}: {
  active: boolean;
  count: number;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-pressed={active}
      className={`inline-flex min-h-10 items-center gap-2 rounded-full px-3.5 text-[.65rem] font-black uppercase tracking-[.08em] transition ${active ? "bg-lime text-ink shadow-md shadow-lime/20" : "border border-white/10 bg-white/5 text-muted hover:border-white/25 hover:text-paper"}`}
      onClick={onClick}
      type="button"
    >
      {label}
      <span className={`rounded-full px-1.5 py-0.5 text-[.58rem] tabular-nums ${active ? "bg-ink/10" : "bg-white/10"}`}>
        {count}
      </span>
    </button>
  );
}
