import Link from "next/link";
import {
  getCrmLeadCountries,
  getCrmLeads,
  getCrmLeadStates,
  getCrmLeadSummaryMetrics,
} from "@/lib/actions/crm";
import { LeadKpiCards } from "./_components/LeadKpiCards";

export const dynamic = "force-dynamic";

type PageSearchParams = Promise<{
  search?: string | string[];
  status?: string | string[];
  country?: string | string[];
  state?: string | string[];
  page?: string | string[];
  limit?: string | string[];
}>;

const statuses = ["NEW", "CONTACTED", "QUALIFIED", "CONVERTED", "CLOSED"] as const;
const pageSizes = [10, 25, 50, 100] as const;

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function makePageHref(
  search: string,
  status: string,
  country: string,
  state: string,
  page: number,
  limit: number,
): string {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (status) params.set("status", status);
  if (country) params.set("country", country);
  if (state) params.set("state", state);
  params.set("page", String(page));
  if (limit !== 25) params.set("limit", String(limit));
  const query = params.toString();
  return query ? `/admin/crm/leads?${query}` : "/admin/crm/leads";
}

function getPositiveInteger(value: string | undefined, fallback: number): number {
  if (!value || !/^\d+$/u.test(value)) return fallback;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function getWebsiteHref(website: string): string | null {
  try {
    const url = new URL(/^https?:\/\//iu.test(website) ? website : `https://${website}`);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}

export default async function CrmLeadsPage({ searchParams }: { searchParams: PageSearchParams }) {
  const params = await searchParams;
  const search = (firstValue(params.search) ?? "").trim().slice(0, 100);
  const requestedStatus = firstValue(params.status) ?? "";
  const status = statuses.find((candidate) => candidate === requestedStatus) ?? "";
  const country = (firstValue(params.country) ?? "").trim().slice(0, 100);
  const state = (firstValue(params.state) ?? "").trim().slice(0, 100);
  const requestedPage = getPositiveInteger(firstValue(params.page), 1);
  const requestedLimit = getPositiveInteger(firstValue(params.limit), 25);
  const limit = pageSizes.find((pageSize) => pageSize === requestedLimit) ?? 25;
  const filters = {
    ...(search ? { search } : {}),
    ...(status ? { status } : {}),
    ...(country ? { country } : {}),
    ...(state ? { state } : {}),
  };
  const [result, countries, states, summary] = await Promise.all([
    getCrmLeads({
      ...filters,
      page: requestedPage,
      limit,
    }),
    getCrmLeadCountries(),
    getCrmLeadStates(country || undefined),
    getCrmLeadSummaryMetrics(filters),
  ]);
  const page = result.ok ? result.page : requestedPage;

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

      {summary.ok ? (
        <LeadKpiCards filters={{ ...filters, limit }} metrics={summary.global} />
      ) : (
        <div
          className="rounded-lg border border-red-900/20 bg-white p-4 text-sm text-red-900"
          role="alert"
        >
          {summary.error}
        </div>
      )}

      <form
        action="/admin/crm/leads"
        className="flex flex-col gap-3 rounded-lg border border-black/10 bg-white p-4 shadow-sm sm:flex-row sm:flex-wrap"
        method="get"
      >
        <input name="page" type="hidden" value="1" />
        <label className="min-w-48 flex-1 text-xs font-bold text-[#55594f]">
          Search leads
          <input
            className="mt-1 min-h-11 w-full rounded-md border border-black/20 px-3 text-sm font-normal text-[#161812] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#718126]"
            defaultValue={search}
            maxLength={100}
            name="search"
            placeholder="Name, email, company, or location"
            type="search"
          />
        </label>
        <label className="text-xs font-bold text-[#55594f] sm:w-44">
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
        <label className="text-xs font-bold text-[#55594f] sm:w-44">
          Country
          <select
            className="mt-1 min-h-11 w-full rounded-md border border-black/20 bg-white px-3 text-sm font-normal text-[#161812] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#718126]"
            defaultValue={country}
            name="country"
          >
            <option value="">All countries</option>
            {countries.map((leadCountry) => (
              <option key={leadCountry} value={leadCountry}>
                {leadCountry}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-bold text-[#55594f] sm:w-44">
          State / Province
          <select
            className="mt-1 min-h-11 w-full rounded-md border border-black/20 bg-white px-3 text-sm font-normal text-[#161812] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#718126]"
            defaultValue={state}
            name="state"
          >
            <option value="">All states / provinces</option>
            {states.map((leadState) => (
              <option key={leadState} value={leadState}>
                {leadState}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-bold text-[#55594f] sm:w-36">
          Page size
          <select
            className="mt-1 min-h-11 w-full rounded-md border border-black/20 bg-white px-3 text-sm font-normal text-[#161812] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#718126]"
            defaultValue={limit}
            name="limit"
          >
            {pageSizes.map((pageSize) => (
              <option key={pageSize} value={pageSize}>
                {pageSize} per page
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
            href={makePageHref("", "", "", "", 1, limit)}
          >
            Clear all filters
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
            <table className="w-full min-w-[1000px] border-collapse text-left text-sm">
              <thead className="bg-[#f4f5f1] text-xs uppercase tracking-[.08em] text-[#55594f]">
                <tr>
                  <th className="px-4 py-3">Name / email</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Location</th>
                  <th className="px-4 py-3">Address / website</th>
                  <th className="px-4 py-3">Type / status</th>
                  <th className="px-4 py-3">Notes / received</th>
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
                    <td className="px-4 py-4">
                      {lead.country ? (
                        <span className="inline-flex rounded-full bg-[#f0f2e8] px-2.5 py-1 text-xs font-semibold text-[#4e5d1c]">
                          {lead.country}
                        </span>
                      ) : (
                        <span className="text-[#55594f]">—</span>
                      )}
                      {(lead.city || lead.state) && (
                        <span className="mt-1 block text-xs text-[#65695f]">
                          {[lead.city, lead.state].filter(Boolean).join(" • ")}
                        </span>
                      )}
                    </td>
                    <td className="max-w-64 px-4 py-4 text-[#55594f]">
                      {lead.address && (
                        <span className="block whitespace-pre-line">{lead.address}</span>
                      )}
                      {lead.website &&
                        (getWebsiteHref(lead.website) ? (
                          <a
                            className="mt-1 block break-all text-xs text-[#4e5d1c] underline underline-offset-2 hover:text-[#171a14]"
                            href={getWebsiteHref(lead.website) ?? undefined}
                            rel="noreferrer"
                            target="_blank"
                          >
                            {lead.website}
                          </a>
                        ) : (
                          <span className="mt-1 block break-all text-xs">{lead.website}</span>
                        ))}
                      {!lead.address && !lead.website && "—"}
                    </td>
                    <td className="px-4 py-4">
                      <span className="block text-[#55594f]">{lead.type}</span>
                      <span className="mt-1 inline-flex rounded-full bg-[#f0f2e8] px-2.5 py-1 text-xs font-semibold text-[#4e5d1c]">
                        {lead.status.charAt(0) + lead.status.slice(1).toLowerCase()}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-[#55594f]">
                      {new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(
                        lead.createdAt,
                      )}
                      {lead.notes && (
                        <details className="mt-2 max-w-64 text-xs">
                          <summary className="cursor-pointer font-semibold text-[#4e5d1c] underline underline-offset-2">
                            View notes
                          </summary>
                          <p className="mt-1 whitespace-pre-line break-words text-[#65695f]">
                            {lead.notes}
                          </p>
                        </details>
                      )}
                      {lead.message && (
                        <details className="mt-2 max-w-64 text-xs">
                          <summary className="cursor-pointer font-semibold text-[#4e5d1c] underline underline-offset-2">
                            View message
                          </summary>
                          <p className="mt-1 whitespace-pre-line break-words text-[#65695f]">
                            {lead.message}
                          </p>
                        </details>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-col gap-3 rounded-lg border border-black/10 bg-white px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
            <p aria-live="polite" className="text-[#55594f]">
              Page {page} of {Math.max(1, result.totalPages)} · {result.totalCount} leads
            </p>
            <nav aria-label="Lead pagination" className="flex gap-2">
              {page > 1 ? (
                <Link
                  className="inline-flex min-h-10 items-center border border-black/20 px-3 text-xs font-bold uppercase tracking-[.06em] hover:border-[#718126] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#718126]"
                  href={makePageHref(search, status, country, state, page - 1, limit)}
                >
                  Previous
                </Link>
              ) : (
                <span className="inline-flex min-h-10 items-center border border-black/10 px-3 text-xs font-bold uppercase tracking-[.06em] text-[#989b92]">
                  Previous
                </span>
              )}
              {page < result.totalPages ? (
                <Link
                  className="inline-flex min-h-10 items-center border border-black/20 px-3 text-xs font-bold uppercase tracking-[.06em] hover:border-[#718126] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#718126]"
                  href={makePageHref(search, status, country, state, page + 1, limit)}
                >
                  Next
                </Link>
              ) : (
                <span className="inline-flex min-h-10 items-center border border-black/10 px-3 text-xs font-bold uppercase tracking-[.06em] text-[#989b92]">
                  Next
                </span>
              )}
            </nav>
          </div>
        </>
      )}
    </section>
  );
}
