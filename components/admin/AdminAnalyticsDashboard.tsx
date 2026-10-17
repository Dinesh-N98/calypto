"use client";

import { useEffect, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type {
  AnalyticsDashboardData,
  AnalyticsMetric,
  AnalyticsRange,
} from "@/lib/analytics-types";

const ranges: Array<{ value: AnalyticsRange; label: string }> = [
  { value: "24h", label: "Last 24 hours" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
];

const numberFormatter = new Intl.NumberFormat("en-US");

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isMetric(value: unknown): value is AnalyticsMetric {
  return (
    isRecord(value) &&
    typeof value.name === "string" &&
    typeof value.value === "number" &&
    Number.isFinite(value.value)
  );
}

function isAnalyticsData(value: unknown): value is AnalyticsDashboardData {
  if (!isRecord(value) || !isRecord(value.summary)) return false;
  return (
    typeof value.summary.visitors === "number" &&
    Number.isFinite(value.summary.visitors) &&
    typeof value.summary.pageviews === "number" &&
    Number.isFinite(value.summary.pageviews) &&
    Array.isArray(value.pageviews) &&
    value.pageviews.every(
      (point) =>
        isRecord(point) &&
        typeof point.timestamp === "string" &&
        typeof point.pageviews === "number" &&
        Number.isFinite(point.pageviews),
    ) &&
    ["topPages", "productViews", "countries", "cities", "devices", "operatingSystems", "referrers"]
      .every((key) => Array.isArray(value[key]) && value[key].every(isMetric))
  );
}

function formatTimestamp(timestamp: string, range: AnalyticsRange): string {
  const numericTimestamp = Number(timestamp);
  const date = Number.isFinite(numericTimestamp)
    ? new Date(numericTimestamp < 1_000_000_000_000 ? numericTimestamp * 1000 : numericTimestamp)
    : new Date(timestamp);

  if (!Number.isFinite(date.getTime())) return timestamp;
  return new Intl.DateTimeFormat("en-US", {
    month: range === "24h" ? undefined : "short",
    day: range === "24h" ? undefined : "numeric",
    hour: "numeric",
    ...(range === "24h" ? {} : { timeZone: "UTC" }),
  }).format(date);
}

function isProductDetailPage(path: string, productPaths: Set<string>): boolean {
  if (productPaths.has(path)) return true;

  try {
    const pathname = new URL(path, "https://calyptobait.com").pathname;
    return pathname.startsWith("/shop/") && pathname !== "/shop/";
  } catch {
    return false;
  }
}

function classifyReferrer(referrer: string): "Direct" | "Search" | "Social" | "Other" {
  const value = referrer.trim().toLowerCase();
  if (!value || ["direct", "(direct)", "none", "(none)", "null", "n/a", "-"].includes(value)) {
    return "Direct";
  }

  let host = value;
  try {
    host = new URL(value.includes("://") ? value : `https://${value}`).hostname.toLowerCase();
  } catch {
    host = value;
  }
  host = host.replace(/^www\./, "");

  if (
    /(^|\.)((google|bing|yahoo|duckduckgo|baidu|yandex|ecosia)\.[^.]+)$/.test(host)
  ) {
    return "Search";
  }
  if (
    /(^|\.)((facebook|instagram|tiktok|pinterest|x|twitter|reddit|youtube|linkedin|threads)\.[^.]+)$/.test(
      host,
    )
  ) {
    return "Social";
  }
  return "Other";
}

function aggregateReferrers(referrers: AnalyticsMetric[]): AnalyticsMetric[] {
  const totals = new Map<string, number>([
    ["Direct", 0],
    ["Search", 0],
    ["Social", 0],
    ["Other", 0],
  ]);

  for (const referrer of referrers) {
    const category = classifyReferrer(referrer.name);
    totals.set(category, (totals.get(category) ?? 0) + referrer.value);
  }

  return Array.from(totals, ([name, value]) => ({ name, value })).filter(
    (source) => source.value > 0,
  );
}

function formatMetricLabel(value: number): string {
  return numberFormatter.format(value);
}

function LoadingSkeleton() {
  return (
    <div aria-label="Loading analytics" aria-busy="true" className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        {[0, 1].map((item) => (
          <div className="h-28 animate-pulse rounded-lg bg-white shadow-sm" key={item} />
        ))}
      </div>
      <div className="h-80 animate-pulse rounded-lg bg-white shadow-sm" />
      <div className="grid gap-4 xl:grid-cols-2">
        {[0, 1, 2, 3].map((item) => (
          <div className="h-64 animate-pulse rounded-lg bg-white shadow-sm" key={item} />
        ))}
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="grid min-h-36 place-items-center rounded-md border border-dashed border-black/15 px-5 text-center text-sm text-[#65695f]">
      {message}
    </div>
  );
}

function MetricList({
  title,
  metrics,
  emptyMessage = "No data available for this period.",
}: {
  title: string;
  metrics: AnalyticsMetric[];
  emptyMessage?: string;
}) {
  return (
    <section className="rounded-lg border border-black/10 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-base font-bold">{title}</h2>
      {metrics.length === 0 ? (
        <div className="mt-4">
          <EmptyState message={emptyMessage} />
        </div>
      ) : (
        <ul className="mt-4 divide-y divide-black/5">
          {metrics.map((metric) => {
            const maxValue = Math.max(...metrics.map(({ value }) => value), 1);
            const width = Math.max((metric.value / maxValue) * 100, 2);
            return (
              <li className="py-3 first:pt-0 last:pb-0" key={metric.name}>
                <div className="flex items-start justify-between gap-4 text-sm">
                  <span className="min-w-0 break-all font-medium text-[#34372e]">
                    {metric.name}
                  </span>
                  <span className="shrink-0 tabular-nums text-[#65695f]">
                    {formatMetricLabel(metric.value)}
                  </span>
                </div>
                <div
                  aria-hidden="true"
                  className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#eef0e8]"
                >
                  <div
                    className="h-full rounded-full bg-[#a3bd32]"
                    style={{ width: `${width}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function GeographyTable({
  countries,
  cities,
}: {
  countries: AnalyticsMetric[];
  cities: AnalyticsMetric[];
}) {
  return (
    <section className="rounded-lg border border-black/10 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-base font-bold">Visitor geography</h2>
      <div className="mt-5 grid gap-6 md:grid-cols-2">
        {[
          { title: "Countries", metrics: countries },
          { title: "Cities", metrics: cities },
        ].map(({ title, metrics }) => (
          <div key={title}>
            <h3 className="mb-3 text-sm font-semibold text-[#65695f]">{title}</h3>
            {metrics.length === 0 ? (
              <EmptyState message={`No ${title.toLowerCase()} data for this period.`} />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-black/10 text-xs uppercase tracking-wide text-[#65695f]">
                      <th className="pb-2 pr-4 font-semibold">{title.slice(0, -1)}</th>
                      <th className="pb-2 text-right font-semibold">Views</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.map((metric) => (
                      <tr className="border-b border-black/5 last:border-0" key={metric.name}>
                        <td className="max-w-0 truncate py-3 pr-4" title={metric.name}>
                          {metric.name}
                        </td>
                        <td className="py-3 text-right tabular-nums">
                          {formatMetricLabel(metric.value)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

export function AdminAnalyticsDashboard() {
  const [range, setRange] = useState<AnalyticsRange>("7d");
  const [data, setData] = useState<AnalyticsDashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function loadAnalytics() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/admin/analytics?range=${range}`, {
          signal: controller.signal,
          cache: "no-store",
        });
        let payload: unknown;
        try {
          payload = await response.json();
        } catch {
          throw new Error("The analytics service returned an unreadable response.");
        }

        if (!response.ok) {
          const message =
            isRecord(payload) && typeof payload.error === "string"
              ? payload.error
              : "Unable to load analytics right now.";
          throw new Error(message);
        }
        if (!isAnalyticsData(payload)) {
          throw new Error("The analytics service returned data in an unexpected format.");
        }
        setData(payload);
      } catch (loadError) {
        if (controller.signal.aborted) return;
        setData(null);
        setError(
          loadError instanceof Error ? loadError.message : "Unable to load analytics right now.",
        );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void loadAnalytics();
    return () => controller.abort();
  }, [range, retryCount]);

  const productPaths = new Set(data?.productViews.map(({ name }) => name) ?? []);
  const referrals = data ? aggregateReferrers(data.referrers) : [];

  return (
    <div className="space-y-8">
      <section
        aria-labelledby="analytics-page-title"
        className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"
      >
        <div>
          <p className="text-xs font-bold uppercase tracking-[.14em] text-[#718126]">
            Workspace
          </p>
          <h1
            className="mt-2 text-3xl font-black tracking-[-.04em] sm:text-4xl"
            id="analytics-page-title"
          >
            Analytics
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#65695f]">
            Storefront traffic, popular product pages, and visitor breakdowns.
          </p>
        </div>
        <label className="grid gap-2 text-sm font-semibold" htmlFor="analytics-range">
          Date range
          <select
            className="min-h-11 min-w-44 rounded-md border border-black/15 bg-white px-3 text-sm font-medium shadow-sm outline-none focus:border-[#718126] focus:ring-2 focus:ring-[#a3bd32]/30"
            id="analytics-range"
            onChange={(event) => setRange(event.target.value as AnalyticsRange)}
            value={range}
          >
            {ranges.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </section>

      {error && (
        <div
          aria-live="polite"
          className="flex flex-col gap-3 rounded-lg border border-red-300 bg-red-50 p-5 text-sm text-red-900 sm:flex-row sm:items-center sm:justify-between"
          role="alert"
        >
          <div>
            <h2 className="font-bold">Analytics unavailable</h2>
            <p className="mt-1">{error}</p>
          </div>
          <button
            className="min-h-10 shrink-0 rounded-md border border-red-300 bg-white px-4 font-semibold hover:bg-red-100"
            onClick={() => setRetryCount((count) => count + 1)}
            type="button"
          >
            Try again
          </button>
        </div>
      )}

      {loading ? (
        <LoadingSkeleton />
      ) : data ? (
        <>
          <section aria-label="Traffic summary" className="grid gap-4 sm:grid-cols-2">
            {[
              { label: "Total visitors", value: data.summary.visitors },
              { label: "Page views", value: data.summary.pageviews },
            ].map((metric) => (
              <div
                className="rounded-lg border border-black/10 bg-white p-5 shadow-sm sm:p-6"
                key={metric.label}
              >
                <p className="text-sm font-semibold text-[#65695f]">{metric.label}</p>
                <p className="mt-2 text-3xl font-black tracking-tight tabular-nums">
                  {formatMetricLabel(metric.value)}
                </p>
              </div>
            ))}
          </section>

          <section className="rounded-lg border border-black/10 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-5">
              <h2 className="text-base font-bold">Page views over time</h2>
              <p className="mt-1 text-sm text-[#65695f]">
                {range === "24h" ? "Hourly" : "Daily"} activity for the selected range.
              </p>
            </div>
            {data.pageviews.length === 0 ? (
              <EmptyState message="No page-view trend data for this period." />
            ) : (
              <div aria-label="Page-view trend chart" className="h-72 w-full" role="img">
                <ResponsiveContainer height="100%" width="100%">
                  <LineChart
                    data={data.pageviews.map((point) => ({
                      ...point,
                      label: formatTimestamp(point.timestamp, range),
                    }))}
                    margin={{ top: 8, right: 12, left: -16, bottom: 0 }}
                  >
                    <CartesianGrid stroke="#e8eae2" strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      axisLine={false}
                      dataKey="label"
                      minTickGap={28}
                      tick={{ fill: "#65695f", fontSize: 12 }}
                      tickLine={false}
                    />
                    <YAxis
                      allowDecimals={false}
                      axisLine={false}
                      tick={{ fill: "#65695f", fontSize: 12 }}
                      tickLine={false}
                      width={48}
                    />
                    <Tooltip
                      contentStyle={{
                        border: "1px solid rgba(0,0,0,.1)",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                      formatter={(value) => [formatMetricLabel(Number(value)), "Page views"]}
                    />
                    <Line
                      activeDot={{ r: 5 }}
                      dataKey="pageviews"
                      dot={false}
                      name="Page views"
                      stroke="#718126"
                      strokeWidth={2.5}
                      type="monotone"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </section>

          <section className="grid gap-4 xl:grid-cols-2">
            <section className="rounded-lg border border-black/10 bg-white p-5 shadow-sm sm:p-6">
              <h2 className="text-base font-bold">Top pages</h2>
              {data.topPages.length === 0 ? (
                <div className="mt-4">
                  <EmptyState message="No page data for this period." />
                </div>
              ) : (
                <ul className="mt-4 divide-y divide-black/5">
                  {data.topPages.map((page) => {
                    const productPage = isProductDetailPage(page.name, productPaths);
                    return (
                      <li
                        className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0"
                        key={page.name}
                      >
                        <span className="min-w-0 break-all text-sm font-medium">
                          {page.name}
                          {productPage && (
                            <span className="ml-2 inline-flex rounded-full bg-[#eef2dc] px-2 py-0.5 text-[.65rem] font-bold uppercase tracking-wide text-[#56621d]">
                              Product
                            </span>
                          )}
                        </span>
                        <span className="shrink-0 text-sm tabular-nums text-[#65695f]">
                          {formatMetricLabel(page.value)}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
              {data.productViews.length > 0 && (
                <p className="mt-5 border-t border-black/5 pt-4 text-xs font-semibold text-[#65695f]">
                  Product detail views
                  <span className="ml-2 text-[#171a14]">
                    {formatMetricLabel(
                      data.productViews.reduce((total, product) => total + product.value, 0),
                    )}
                  </span>
                </p>
              )}
            </section>
            <GeographyTable cities={data.cities} countries={data.countries} />
          </section>

          <section className="grid gap-4 xl:grid-cols-2">
            <MetricList metrics={data.devices} title="Devices" />
            <MetricList metrics={data.operatingSystems} title="Operating systems" />
            <MetricList metrics={referrals} title="Referral sources" />
            <MetricList metrics={data.referrers} title="Top referrers" />
          </section>
        </>
      ) : null}
    </div>
  );
}
