import Link from "next/link";
import { createCategory, deleteCategory } from "@/app/admin/catalog-actions";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  const [{ notice }, categories] = await Promise.all([
    searchParams,
    prisma.category.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { products: true } } },
    }),
  ]);

  return (
    <div className="space-y-8">
      <header>
        <Link className="text-xs font-bold text-[#687b26] hover:underline" href="/admin">
          Admin dashboard
        </Link>
        <h1 className="mt-2 text-3xl font-black tracking-[-.04em] sm:text-4xl">Categories</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[#65695f]">
          Add shop categories and keep products assigned to the right collection.
        </p>
      </header>

      {notice && (
        <p
          aria-live="polite"
          className="rounded-md border border-black/10 bg-white px-4 py-3 text-sm"
        >
          {notice}
        </p>
      )}

      <section className="rounded-lg border border-black/10 bg-white p-5 shadow-sm sm:p-7">
        <h2 className="text-base font-bold">Create category</h2>
        <form action={createCategory} className="mt-4 flex flex-col gap-3 sm:flex-row">
          <label className="flex-1 text-xs font-bold text-[#55594f]">
            Category name
            <input
              className="mt-1 min-h-11 w-full rounded-md border border-black/15 px-3 text-sm font-normal text-[#161812] outline-none focus:border-[#718126]"
              maxLength={100}
              name="name"
              placeholder="e.g. Creature Baits"
              required
            />
          </label>
          <button
            className="min-h-11 self-end rounded-md bg-[#a3bd32] px-5 text-xs font-extrabold uppercase tracking-[.08em] text-[#171a14] hover:bg-[#b6cf45]"
            type="submit"
          >
            Add category
          </button>
        </form>
        <p className="mt-2 text-xs text-[#73786b]">
          The URL slug is generated from the category name.
        </p>
      </section>

      <section className="overflow-hidden rounded-lg border border-black/10 bg-white shadow-sm">
        <div className="border-b border-black/10 px-5 py-4 sm:px-7">
          <h2 className="text-base font-bold">Existing categories ({categories.length})</h2>
        </div>
        {categories.length === 0 ? (
          <p className="px-5 py-8 text-sm text-[#65695f] sm:px-7">
            No categories yet. Create a category before adding products.
          </p>
        ) : (
          <ul className="divide-y divide-black/10">
            {categories.map((category) => (
              <li
                className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7"
                key={category.id}
              >
                <div>
                  <p className="font-bold">{category.name}</p>
                  <p className="mt-1 text-xs text-[#73786b]">
                    /{category.slug} · {category._count.products}{" "}
                    {category._count.products === 1 ? "product" : "products"}
                  </p>
                </div>
                <form action={deleteCategory}>
                  <input name="id" type="hidden" value={category.id} />
                  <button
                    className="min-h-10 rounded-md border border-red-700/30 px-4 text-xs font-bold text-red-800 hover:bg-red-50"
                    type="submit"
                  >
                    Delete
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
