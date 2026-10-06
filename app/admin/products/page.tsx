import Link from "next/link";
import { createProduct, deleteProduct, updateProduct } from "@/app/admin/catalog-actions";
import { formatPrice } from "@/lib/currency";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function ProductFields({
  categories,
  product,
}: {
  categories: { id: string; name: string }[];
  product?: {
    id: string;
    name: string;
    slug: string;
    description: string;
    priceCents: number;
    imageUrl: string;
    categoryId: string;
  };
}) {
  return (
    <>
      {product && <input name="id" type="hidden" value={product.id} />}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-bold text-[#55594f]">
          Product name
          <input
            className="admin-catalog-input"
            defaultValue={product?.name}
            maxLength={160}
            name="name"
            required
          />
        </label>
        <label className="text-xs font-bold text-[#55594f]">
          URL slug
          <input
            className="admin-catalog-input"
            defaultValue={product?.slug}
            maxLength={120}
            name="slug"
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
            required
          />
        </label>
        <label className="text-xs font-bold text-[#55594f]">
          Price (USD)
          <input
            className="admin-catalog-input"
            defaultValue={product ? (product.priceCents / 100).toFixed(2) : ""}
            inputMode="decimal"
            min="0.01"
            name="price"
            placeholder="9.99"
            required
            step="0.01"
            type="number"
          />
        </label>
        <label className="text-xs font-bold text-[#55594f]">
          Category
          <select
            className="admin-catalog-input"
            defaultValue={product?.categoryId ?? ""}
            name="categoryId"
            required
          >
            <option disabled value="">
              Select a category
            </option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-bold text-[#55594f] sm:col-span-2">
          Image path
          <input
            className="admin-catalog-input"
            defaultValue={product?.imageUrl}
            maxLength={500}
            name="imageUrl"
            placeholder="/products/worm/worm-01.jpg"
            required
          />
        </label>
        <label className="text-xs font-bold text-[#55594f] sm:col-span-2">
          Description
          <textarea
            className="admin-catalog-input min-h-24 py-3"
            defaultValue={product?.description}
            maxLength={5000}
            name="description"
            required
            rows={4}
          />
        </label>
      </div>
    </>
  );
}

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  const [{ notice }, categories, products] = await Promise.all([
    searchParams,
    prisma.category.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.product.findMany({
      orderBy: { createdAt: "desc" },
      include: { category: { select: { name: true } } },
    }),
  ]);

  return (
    <div className="space-y-8">
      <header>
        <Link className="text-xs font-bold text-[#687b26] hover:underline" href="/admin">
          Admin dashboard
        </Link>
        <h1 className="mt-2 text-3xl font-black tracking-[-.04em] sm:text-4xl">Products</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[#65695f]">
          Create and maintain the products shown in the storefront.
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
        <h2 className="text-base font-bold">Create product</h2>
        {categories.length === 0 ? (
          <p className="mt-3 text-sm text-[#65695f]">
            Create a category before adding products.{" "}
            <Link className="font-bold text-[#687b26] underline" href="/admin/categories">
              Manage categories
            </Link>
          </p>
        ) : (
          <form action={createProduct} className="mt-5 space-y-4">
            <ProductFields categories={categories} />
            <button
              className="min-h-11 rounded-md bg-[#a3bd32] px-5 text-xs font-extrabold uppercase tracking-[.08em] text-[#171a14] hover:bg-[#b6cf45]"
              type="submit"
            >
              Add product
            </button>
          </form>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-base font-bold">Catalog ({products.length})</h2>
          <Link
            className="text-xs font-bold text-[#687b26] hover:underline"
            href="/admin/categories"
          >
            Manage categories
          </Link>
        </div>
        {products.length === 0 ? (
          <p className="rounded-lg border border-black/10 bg-white px-5 py-8 text-sm text-[#65695f]">
            No products yet.
          </p>
        ) : (
          products.map((product) => (
            <article
              className="rounded-lg border border-black/10 bg-white p-5 shadow-sm sm:p-7"
              key={product.id}
            >
              <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <h3 className="font-bold">{product.name}</h3>
                  <p className="mt-1 text-xs text-[#73786b]">
                    {product.category.name} · {formatPrice(product.priceCents)} · /shop/
                    {product.slug}
                  </p>
                </div>
                <form action={deleteProduct}>
                  <input name="id" type="hidden" value={product.id} />
                  <button
                    className="min-h-10 rounded-md border border-red-700/30 px-4 text-xs font-bold text-red-800 hover:bg-red-50"
                    type="submit"
                  >
                    Delete product
                  </button>
                </form>
              </div>
              <form action={updateProduct} className="space-y-4">
                <ProductFields
                  categories={categories}
                  product={{
                    id: product.id,
                    name: product.name,
                    slug: product.slug,
                    description: product.description,
                    priceCents: product.priceCents,
                    imageUrl: product.imageUrl,
                    categoryId: product.categoryId,
                  }}
                />
                <button
                  className="min-h-11 rounded-md border border-black/20 px-5 text-xs font-extrabold uppercase tracking-[.08em] hover:bg-[#f4f5f1]"
                  type="submit"
                >
                  Save changes
                </button>
              </form>
            </article>
          ))
        )}
      </section>
    </div>
  );
}
