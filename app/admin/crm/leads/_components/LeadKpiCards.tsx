import Link from "next/link";

type LeadStatus = "NEW" | "CONTACTED" | "QUALIFIED" | "CONVERTED" | "CLOSED";

type LeadMetrics = {
  totalCount: number;
  countryDistribution: { country: string; count: number }[];
  statusCounts: Record<LeadStatus, number>;
  contactCoverage: {
    phoneCount: number;
    phonePercent: number;
    emailCount: number;
    emailPercent: number;
  };
};

type LeadKpiCardsProps = {
  metrics: LeadMetrics;
  filters: {
    search?: string;
    status?: LeadStatus;
    country?: string;
    state?: string;
    limit: number;
  };
};

const statuses: { value: LeadStatus; label: string }[] = [
  { value: "NEW", label: "New" },
  { value: "CONTACTED", label: "Contacted" },
  { value: "QUALIFIED", label: "Qualified" },
  { value: "CONVERTED", label: "Converted" },
  { value: "CLOSED", label: "Closed" },
];

function countryHref(country: string, filters: LeadKpiCardsProps["filters"]): string {
  const params = new URLSearchParams({ country, page: "1" });
  if (filters.search) params.set("search", filters.search);
  if (filters.status) params.set("status", filters.status);
  if (filters.state) params.set("state", filters.state);
  if (filters.limit !== 25) params.set("limit", String(filters.limit));
  return `/admin/crm/leads?${params.toString()}`;
}

function formatCount(count: number): string {
  return new Intl.NumberFormat("en-US").format(count);
}

export function LeadKpiCards({ metrics, filters }: LeadKpiCardsProps) {
  const topCountries = metrics.countryDistribution.slice(0, 6);

  return (
    <section aria-label="Lead summary" className="grid gap-4 lg:grid-cols-3">
      <article className="rounded-lg border border-black/10 bg-white p-5 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-[.08em] text-[#65695f]">
          Total pipeline
        </p>
        <p className="mt-2 text-3xl font-black tracking-[-.04em] text-[#171a14]">
          {formatCount(metrics.totalCount)}
        </p>
        <p className="mt-1 text-xs text-[#65695f]">All leads</p>
        <ul aria-label="Lead counts by status" className="mt-4 flex flex-wrap gap-2">
          {statuses.map(({ value, label }) => (
            <li
              className="rounded-full bg-[#f0f2e8] px-2.5 py-1 text-xs font-semibold text-[#4e5d1c]"
              key={value}
            >
              {label}: {formatCount(metrics.statusCounts[value])}
            </li>
          ))}
        </ul>
      </article>

      <article className="rounded-lg border border-black/10 bg-white p-5 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-[.08em] text-[#65695f]">
          Geographic distribution
        </p>
        {topCountries.length > 0 ? (
          <ul aria-label="Lead counts by country" className="mt-4 flex flex-wrap gap-2">
            {topCountries.map(({ country, count }) => (
              <li key={country}>
                <Link
                  aria-label={`Filter by ${country}, ${formatCount(count)} leads`}
                  className="inline-flex min-h-9 items-center rounded-full bg-[#f0f2e8] px-3 text-xs font-semibold text-[#4e5d1c] hover:bg-[#e5e9d7] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#718126]"
                  href={countryHref(country, filters)}
                >
                  {country}: {formatCount(count)}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-[#65695f]">No country data for these leads.</p>
        )}
      </article>

      <article className="rounded-lg border border-black/10 bg-white p-5 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-[.08em] text-[#65695f]">
          Contact reachability
        </p>
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div>
            <p className="text-2xl font-black tracking-[-.04em] text-[#171a14]">
              {metrics.contactCoverage.phonePercent}%
            </p>
            <p className="mt-1 text-xs font-semibold text-[#55594f]">Phone coverage</p>
            <p className="mt-1 text-xs text-[#65695f]">
              {formatCount(metrics.contactCoverage.phoneCount)} leads
            </p>
          </div>
          <div>
            <p className="text-2xl font-black tracking-[-.04em] text-[#171a14]">
              {metrics.contactCoverage.emailPercent}%
            </p>
            <p className="mt-1 text-xs font-semibold text-[#55594f]">Email coverage</p>
            <p className="mt-1 text-xs text-[#65695f]">
              {formatCount(metrics.contactCoverage.emailCount)} leads
            </p>
          </div>
        </div>
        <p className="mt-4 text-xs text-[#65695f]">
          Phone numbers are counted; WhatsApp availability is not verified.
        </p>
      </article>
    </section>
  );
}
