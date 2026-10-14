import Link from "next/link";
import { getCrmLeads } from "@/lib/actions/crm";

export const dynamic = "force-dynamic";

type PageSearchParams = Promise<{
  search?: string | string[];
  status?: string | string[];
  cursor?: string | string[];
}>;

const statuses = ["NEW", "CONTACTED", "QUALIFIED", "CONVERTED", "CLOSED"] as const;

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function makePageHref(search: string, status: string, cursor: string | null): string {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (status) params.set("status", status);
  if (cursor) params.set("cursor", cursor);
  const query = params.toString();
  return query ? `/admin/crm/leads?${query}` : "/admin/crm/leads";
}

export default async function CrmLeadsPage({ searchParams }: { searchParams: PageSearchParams }) {
  const params = await searchParams;
  const search = (firstValue(params.search) ?? "").trim().slice(0, 100);
  const requestedStatus = firstValue(params.status) ?? "";
  const status = statuses.find((candidate) => candidate === requestedStatus) ?? "";
  const cursor = firstValue(params.cursor)?.trim().slice(0, 191);
  const result = await getCrmLeads({
    ...(search ? { search } : {}),
    ...(status ? { status } : {}),
    ...(cursor ? { cursor } : {}),
  });

  return (
    <section aria-labelledby="crm-leads-title" className="space-y-6">
      <header>
        <p className="text-xs font-bold uppercase tracking-[.14em] text-[#718126]">CRM</p>
        <h1 className="mt-2 text-3xl font-black tracking-[-.04em]" id="crm-leads-title">
          Leads
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[#65695f]">
          Review incoming inquiries and track their progress.
        </p>
      </header>

      <form
        action="/admin/crm/leads"
        className="flex flex-col gap-3 rounded-lg border border-black/10 bg-white p-4 shadow-sm sm:flex-row"
        method="get"
      >
        <label className="flex-1 text-xs font-bold text-[#55594f]">
          Search leads
          <input
            className="mt-1 min-h-11 w-full rounded-md border border-black/20 px-3 text-sm font-normal text-[#161812] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#718126]"
            defaultValue={search}
            maxLength={100}
            name="search"
            placeholder="Name, email, or company"
            type="search"
          />
        </label>
        <label className="text-xs font-bold text-[#55594f] sm:w-56">
          Status
          <select
            className="mt-1 min-h-11 w-full rounded-md border border-black/20 bg-white px-3 text-sm font-normal text-[#161812] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#718126]"
            defaultValue={status}
            name="status"
          >
            <option value="">All statuses</option>
            {statuses.map((leadStatus) => (
              <option key={leadStatus} value={leadStatus}>
                {leadStatus.charAt(0) + leadStatus.slice(1).toLowerCase()}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-end gap-2">
          <button
            className="min-h-11 bg-[#171a14] px-4 text-xs font-bold uppercase tracking-[.06em] text-white hover:bg-[#34382e] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#718126]"
            type="submit"
          >
            Apply
          </button>
          <Link
            className="inline-flex min-h-11 items-center px-3 text-xs font-bold uppercase tracking-[.06em] text-[#55594f] underline underline-offset-4 hover:text-[#171a14] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#718126]"
            href="/admin/crm/leads"
          >
            Clear
          </Link>
        </div>
      </form>

      {!result.ok ? (
        <div className="rounded-lg border border-red-900/20 bg-white p-6 text-sm text-red-900">
          {result.error}
        </div>
      ) : result.leads.length === 0 ? (
        <div className="rounded-lg border border-black/10 bg-white p-6 text-sm text-[#65695f]">
          No leads match these filters.
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-black/10 bg-white shadow-sm">
            <table className="w-full min-w-[760px] border-collapse text-left text-sm">
              <thead className="bg-[#f4f5f1] text-xs uppercase tracking-[.08em] text-[#55594f]">
                <tr>
                  <th className="px-4 py-3">Name / email</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Company</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Received</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/10">
                {result.leads.map((lead) => (
                  <tr key={lead.id}>
                    <td className="px-4 py-4">
                      <span className="block font-bold">{lead.name}</span>
                      {lead.email ? (
                        <a
                          className="mt-1 block text-xs text-[#65695f] underline underline-offset-2 hover:text-[#171a14]"
                          href={`mailto:${lead.email}`}
                        >
                          {lead.email}
                        </a>
                      ) : (
                        <span className="mt-1 block text-xs text-[#65695f]">No email provided</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-[#55594f]">{lead.phone || "—"}</td>
                    <td className="px-4 py-4 text-[#55594f]">{lead.company || "—"}</td>
                    <td className="px-4 py-4 text-[#55594f]">{lead.type}</td>
                    <td className="px-4 py-4">
                      <span className="inline-flex rounded-full bg-[#f0f2e8] px-2.5 py-1 text-xs font-semibold text-[#4e5d1c]">
                        {lead.status.charAt(0) + lead.status.slice(1).toLowerCase()}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-[#55594f]">
                      {new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(
                        lead.createdAt,
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {result.nextCursor && (
            <div className="flex justify-end">
              <Link
                className="inline-flex min-h-11 items-center border border-black/20 bg-white px-4 text-xs font-bold uppercase tracking-[.06em] hover:border-[#718126] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#718126]"
                href={makePageHref(search, status, result.nextCursor)}
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
