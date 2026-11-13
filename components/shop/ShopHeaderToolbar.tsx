"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";

type Category = { name: string; slug: string };

export function ShopHeaderToolbar({
  categories,
}: {
  categories: Category[];
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const paramsString = searchParams.toString();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams(paramsString);
      params.delete("inStock");
      params.delete("onSale");
      params.delete("sort");
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
    params.delete("inStock");
    params.delete("onSale");
    params.delete("sort");
    if (value) params.set(key, value);
    else params.delete(key);
    const next = params.toString();
    router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false });
  }

  const activeCategory = searchParams.get("category");

  return (
    <section className="mt-4 mb-6 border-b border-white/10 py-4 md:mb-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <nav className="flex flex-wrap gap-2" aria-label="Product categories">
          <CategoryPill
            active={!activeCategory}
            label="All gear"
            onClick={() => updateParam("category", null)}
          />
          {categories.map((category) => (
            <CategoryPill
              active={activeCategory === category.slug}
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
    </section>
  );
}

function CategoryPill({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-pressed={active}
      className={`inline-flex min-h-10 items-center justify-center rounded-full px-4 text-[.65rem] font-black uppercase tracking-[.08em] transition ${active ? "bg-lime text-ink shadow-md shadow-lime/20" : "border border-white/10 bg-white/5 text-muted hover:border-white/25 hover:text-paper"}`}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}
