import Link from "next/link";

export default function AdminPage() {
  return (
    <div className="space-y-8">
      <section aria-labelledby="admin-page-title" id="overview">
        <p className="text-xs font-bold uppercase tracking-[.14em] text-[#718126]">Workspace</p>
        <h1
          className="mt-2 text-3xl font-black tracking-[-.04em] sm:text-4xl"
          id="admin-page-title"
        >
          Dashboard
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[#65695f]">
          Manage the products and categories available in the Calypto storefront.
        </p>
      </section>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          className="rounded-lg border border-black/10 bg-white p-5 shadow-sm transition hover:border-[#a3bd32] sm:p-7"
          href="/admin/products"
        >
          <h2 className="text-base font-bold">Products</h2>
          <p className="mt-2 text-sm leading-6 text-[#65695f]">
            Create, edit, and remove products from the storefront catalog.
          </p>
        </Link>
        <Link
          className="rounded-lg border border-black/10 bg-white p-5 shadow-sm transition hover:border-[#a3bd32] sm:p-7"
          href="/admin/categories"
        >
          <h2 className="text-base font-bold">Categories</h2>
          <p className="mt-2 text-sm leading-6 text-[#65695f]">
            Create and delete categories used to organize products.
          </p>
        </Link>
        <Link
          className="rounded-lg border border-black/10 bg-white p-5 shadow-sm transition hover:border-[#a3bd32] sm:p-7"
          href="/admin/promotions"
        >
          <h2 className="text-base font-bold">Promotions</h2>
          <p className="mt-2 text-sm leading-6 text-[#65695f]">
            Schedule storefront offers, manage discount details, and toggle their visibility.
          </p>
        </Link>
        <Link
          className="rounded-lg border border-black/10 bg-white p-5 shadow-sm transition hover:border-[#a3bd32] sm:p-7"
          href="/admin/orders"
        >
          <h2 className="text-base font-bold">Orders</h2>
          <p className="mt-2 text-sm leading-6 text-[#65695f]">
            Review customer orders and add shipment tracking details.
          </p>
        </Link>
      </div>
    </div>
  );
}
