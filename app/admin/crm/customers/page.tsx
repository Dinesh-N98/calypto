import Link from "next/link";
import { getCrmCustomers } from "@/lib/actions/crm";

export const dynamic = "force-dynamic";

type PageSearchParams = Promise<{
  search?: string | string[];
  cursor?: string | string[];
}>;

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function CrmCustomersPage({
  searchParams,
}: {
  searchParams: PageSearchParams;
}) {
  const params = await searchParams;
  const search = (firstValue(params.search) ?? "").trim().slice(0, 100);
  const cursor = firstValue(params.cursor)?.trim().slice(0, 191);
  const result = await getCrmCustomers({
    ...(search ? { search } : {}),
    ...(cursor ? { cursor } : {}),
  });

  return (
    <section aria-labelledby="crm-customers-title" className="space-y-6">
      <header>
        <p className="text-xs font-bold uppercase tracking-[.14em] text-[#718126]">CRM</p>
        <h1 className="mt-2 text-3xl font-black tracking-[-.04em]" id="crm-customers-title">
          Customers
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[#65695f]">
          Find registered customers and review their recent activity.
        </p>
      </header>

      <form
        action="/admin/crm/customers"
        className="flex flex-col gap-3 rounded-lg border border-black/10 bg-white p-4 shadow-sm sm:flex-row"
        method="get"
      >
        <label className="flex-1 text-xs font-bold text-[#55594f]">
          Search customers
          <input
            className="mt-1 min-h-11 w-full rounded-md border border-black/20 px-3 text-sm font-normal text-[#161812] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#718126]"
            defaultValue={search}
            maxLength={100}
            name="search"
            placeholder="Name or email"
            type="search"
          />
        </label>
        <div className="flex items-end gap-2">
          <button
            className="min-h-11 bg-[#171a14] px-4 text-xs font-bold uppercase tracking-[.06em] text-white hover:bg-[#34382e] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#718126]"
            type="submit"
          >
            Search
          </button>
          <Link
            className="inline-flex min-h-11 items-center px-3 text-xs font-bold uppercase tracking-[.06em] text-[#55594f] underline underline-offset-4 hover:text-[#171a14] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#718126]"
            href="/admin/crm/customers"
          >
            Clear
          </Link>
        </div>
      </form>

      {!result.ok ? (
        <div className="rounded-lg border border-red-900/20 bg-white p-6 text-sm text-red-900">
          {result.error}
        </div>
      ) : result.customers.length === 0 ? (
        <div className="rounded-lg border border-black/10 bg-white p-6 text-sm text-[#65695f]">
          No customers match this search.
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-black/10 bg-white shadow-sm">
            <table className="w-full min-w-[680px] border-collapse text-left text-sm">
              <thead className="bg-[#f4f5f1] text-xs uppercase tracking-[.08em] text-[#55594f]">
                <tr>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Orders</th>
                  <th className="px-4 py-3">
                    <span className="sr-only">Details</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/10">
                {result.customers.map((customer) => {
                  const name =
                    [customer.firstName, customer.lastName].filter(Boolean).join(" ") ||
                    customer.name ||
                    "Unnamed customer";
                  return (
                    <tr key={customer.id}>
                      <td className="px-4 py-4">
                        <span className="block font-bold">{name}</span>
                        <span className="mt-1 block text-xs text-[#65695f]">{customer.email}</span>
                      </td>
                      <td className="px-4 py-4 text-[#55594f]">{customer.phone || "—"}</td>
                      <td className="px-4 py-4 text-[#55594f]">{customer._count.orders}</td>
                      <td className="px-4 py-4 text-right">
                        <Link
                          className="inline-flex min-h-10 items-center border border-black/20 px-3 text-xs font-bold uppercase tracking-[.06em] hover:border-[#718126] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#718126]"
                          href={`/admin/crm/customers/${customer.id}`}
                        >
                          View customer
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {result.nextCursor && (
            <div className="flex justify-end">
              <Link
                className="inline-flex min-h-11 items-center border border-black/20 bg-white px-4 text-xs font-bold uppercase tracking-[.06em] hover:border-[#718126] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#718126]"
                href={`/admin/crm/customers?${new URLSearchParams({
                  ...(search ? { search } : {}),
                  cursor: result.nextCursor,
                })}`}
              >
                Next page
              </Link>
            </div>
          )}
        </>
      )}
    </section>
  );
}
