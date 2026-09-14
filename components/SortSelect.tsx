"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function SortSelect({ value }: { value: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  function handleChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("sort", event.target.value);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <label className="flex items-center gap-3 text-[.65rem] font-bold uppercase tracking-[.14em] text-muted">
      Sort by
      <select
        className="border border-[rgba(241,240,232,.18)] bg-transparent px-3 py-3 text-[.65rem] font-bold uppercase tracking-[.1em] text-paper outline-none"
        value={value}
        onChange={handleChange}
        aria-label="Sort products"
      >
        <option className="bg-ink" value="newest">
          Newest
        </option>
        <option className="bg-ink" value="price-asc">
          Price: low to high
        </option>
        <option className="bg-ink" value="price-desc">
          Price: high to low
        </option>
      </select>
    </label>
  );
}
