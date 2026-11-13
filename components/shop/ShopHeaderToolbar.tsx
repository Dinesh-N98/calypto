"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type Category = { name: string; slug: string };

export function ShopHeaderToolbar({
  categories,
}: {
  categories: Category[];
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isExpanded, setIsExpanded] = useState(false);

  function updateParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    const next = params.toString();
    router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false });
  }

  const activeCategory = searchParams.get("category");

  return (
    <>
      {isExpanded && (
        <button
          aria-label="Close category selector"
          className="fixed inset-0 z-20 bg-black/50 backdrop-blur-sm transition-opacity duration-200"
          onClick={() => setIsExpanded(false)}
          type="button"
        />
      )}
      <div className={`relative min-h-9 ${isExpanded ? "z-30" : ""}`}>
        <button
          aria-controls="shop-category-options"
          aria-expanded={isExpanded}
          aria-hidden={isExpanded}
          className={`inline-flex h-8 items-center justify-center gap-2 rounded-full bg-lime px-3.5 text-[11px] font-black uppercase tracking-wider text-ink transition-all duration-200 ease-out hover:bg-[#b6cf45] md:h-9 md:px-4 md:text-xs md:origin-right md:transition-transform md:duration-200 md:ease-out md:hover:scale-105 ${isExpanded ? "pointer-events-none opacity-0" : "opacity-100"}`}
          onClick={() => setIsExpanded(true)}
          tabIndex={isExpanded ? -1 : 0}
          type="button"
        >
          Categories
          <svg aria-hidden="true" className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
            <defs>
              <mask id="caret-cutout">
                <rect width="24" height="24" fill="white" />
                <path
                  d="M8.5 10.25h7c.45 0 .7.52.42.88l-3.5 4.25a.55.55 0 0 1-.84 0l-3.5-4.25a.54.54 0 0 1 .42-.88Z"
                  fill="black"
                />
              </mask>
            </defs>
            <circle cx="12" cy="12" r="10" fill="currentColor" mask="url(#caret-cutout)" />
          </svg>
        </button>
        <nav
          aria-hidden={!isExpanded}
          aria-label="Product categories"
          className={`absolute top-0 right-0 z-30 flex w-44 flex-col items-end gap-2.5 overflow-visible transition-all duration-200 ease-out ${isExpanded ? "max-h-60 opacity-100" : "pointer-events-none max-h-0 opacity-0"}`}
          id="shop-category-options"
        >
          <CategoryPill
            active={!activeCategory}
            label="All gear"
            onClick={() => {
              updateParam("category", null);
              setIsExpanded(false);
            }}
            tabIndex={isExpanded ? 0 : -1}
          />
          {categories.map((category) => (
            <CategoryPill
              active={activeCategory === category.slug}
              key={category.slug}
              label={category.name}
              onClick={() => {
                updateParam("category", activeCategory === category.slug ? null : category.slug);
                setIsExpanded(false);
              }}
              tabIndex={isExpanded ? 0 : -1}
            />
          ))}
        </nav>
      </div>
    </>
  );
}

function CategoryPill({
  active,
  label,
  onClick,
  tabIndex,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  tabIndex: number;
}) {
  return (
    <button
      aria-pressed={active}
      className={`relative inline-flex h-9 w-44 shrink-0 items-center justify-center rounded-full px-5 text-xs font-black uppercase tracking-[.08em] transition-all duration-200 ease-out md:origin-center md:transition-transform md:duration-200 md:ease-out md:hover:z-10 md:hover:scale-105 ${active ? "bg-lime text-ink" : "bg-zinc-900 text-muted hover:text-paper"}`}
      onClick={onClick}
      tabIndex={tabIndex}
      type="button"
    >
      {label}
    </button>
  );
}
