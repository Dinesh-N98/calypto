"use client";

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

  function updateParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    const next = params.toString();
    router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false });
  }

  const activeCategory = searchParams.get("category");

  return (
    <section className="mt-4 mb-6 border-b border-white/10 py-4 md:mb-8">
      <nav
        aria-label="Product categories"
        className="flex flex-nowrap gap-2 overflow-x-auto whitespace-nowrap pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:overflow-visible"
      >
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
      className={`inline-flex min-h-10 shrink-0 items-center justify-center rounded-full px-3.5 py-2 text-xs font-black uppercase tracking-[.08em] transition md:px-5 md:py-2.5 ${active ? "bg-lime text-ink shadow-md shadow-lime/20" : "border border-white/10 bg-white/5 text-muted hover:border-white/25 hover:text-paper"}`}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}
