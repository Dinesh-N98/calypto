"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Globe2,
  MonitorSmartphone,
  ShoppingBag,
  UsersRound,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type {
  AnalyticsDashboardData,
  AnalyticsMetric,
  AnalyticsRange,
  CurrencyMetric,
} from "@/lib/analytics-types";

const ranges: Array<{ value: AnalyticsRange; label: string }> = [
  { value: "24h", label: "24 Hours" },
  { value: "7d", label: "7 Days" },
  { value: "30d", label: "30 Days" },
];

const chartColors = ["#718126", "#3182ce", "#d97706", "#8b5cf6", "#db2777"];
const numberFormatter = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
}

function formatDuration(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "0s";
  const minutes = Math.floor(value / 60);
  const seconds = Math.round(value % 60);
  return minutes ? `${minutes}m ${seconds}s` : `${seconds}s`;
}

function formatMoney(value: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(value / 100);
  } catch {
    return `${currency} ${(value / 100).toFixed(2)}`;
  }
}

function formatCurrencyMetrics(metrics: CurrencyMetric[]): string {
  return metrics.length
    ? metrics.map(({ currency, totalCents }) => formatMoney(totalCents, currency)).join(" · ")
    : "—";
}

function formatTimestamp(timestamp: string, range: AnalyticsRange): string {
  const date = new Date(
    timestamp.includes(" ") ? `${timestamp.replace(" ", "T")}:00:00Z` : `${timestamp}T00:00:00Z`,
  );
  if (!Number.isFinite(date.getTime())) return timestamp;
  return new Intl.DateTimeFormat("en-US", {
    ...(range === "24h" ? {} : { month: "short", day: "numeric" }),
    ...(range === "24h" ? { hour: "numeric" } : {}),
    timeZone: "UTC",
  }).format(date);
}

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
  return (
    isRecord(value) &&
    isRecord(value.summary) &&
    isRecord(value.commerce) &&
    isRecord(value.changes) &&
    Array.isArray(value.trend) &&
    Array.isArray(value.topPages) &&
    value.topPages.every(isMetric) &&
    Array.isArray(value.devices) &&
    value.devices.every(isMetric) &&
    Array.isArray(value.browsers) &&
    value.browsers.every(isMetric) &&
    Array.isArray(value.operatingSystems) &&
    value.operatingSystems.every(isMetric) &&
    Array.isArray(value.countries) &&
    value.countries.every(isMetric) &&
    Array.isArray(value.cities) &&
    value.cities.every(isMetric)
  );
}

function ChangeBadge({ value }: { value: number | null }) {
  if (value === null) {
    return (
      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">
        No baseline
      </span>
    );
  }
  const positive = value >= 0;
  const Icon = positive ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${positive ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}
    >
      <Icon aria-hidden="true" className="h-3.5 w-3.5" />
      {numberFormatter.format(Math.abs(value))}%
    </span>
  );
}

function CurrencyChangeBadges({
  changes,
}: {
  changes: Array<{ currency: string; percent: number | null }>;
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {changes.map(({ currency, percent }) => (
        <span
          className={`rounded-full px-2 py-1 text-[.7rem] font-bold ${
            percent === null
              ? "bg-slate-100 text-slate-500"
              : percent >= 0
                ? "bg-emerald-50 text-emerald-700"
                : "bg-rose-50 text-rose-700"
          }`}
          key={currency}
          title={`${currency} change`}
        >
          {currency}{" "}
          {percent === null
            ? "New"
            : `${percent > 0 ? "+" : ""}${numberFormatter.format(percent)}%`}
        </span>
      ))}
    </div>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <section
      className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 ${className}`}
    >
      {children}
    </section>
  );
}

function LoadingSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading analytics" className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }, (_, index) => (
          <div className="h-36 animate-pulse rounded-2xl bg-white shadow-sm" key={index} />
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <div className="h-96 animate-pulse rounded-2xl bg-white shadow-sm" />
        <div className="h-96 animate-pulse rounded-2xl bg-white shadow-sm" />
      </div>
      <div className="h-72 animate-pulse rounded-2xl bg-white shadow-sm" />
    </div>
  );
}

function MetricBars({ metrics, title }: { metrics: AnalyticsMetric[]; title: string }) {
  return (
    <Card>
      <h3 className="text-base font-bold text-slate-900">{title}</h3>
      {metrics.length ? (
        <ul className="mt-5 space-y-4">
          {metrics.slice(0, 8).map(({ name, value }, index) => {
            const max = metrics[0]?.value || 1;
            return (
              <li key={name}>
                <div className="mb-1.5 flex justify-between gap-4 text-sm">
                  <span className="truncate font-medium text-slate-700" title={name}>
                    {name}
                  </span>
                  <span className="shrink-0 tabular-nums text-slate-500">
                    {formatNumber(value)}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.max((value / max) * 100, 2)}%`,
                      backgroundColor: chartColors[index % chartColors.length],
                    }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-5 rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
          No data for this period.
        </p>
      )}
    </Card>
  );
}

function BreakdownPie({ metrics, title }: { metrics: AnalyticsMetric[]; title: string }) {
  const data = metrics.slice(0, 6);
  return (
    <Card>
      <h3 className="text-base font-bold text-slate-900">{title}</h3>
      {data.length ? (
        <div className="mt-3 h-64">
          <ResponsiveContainer height="100%" width="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                innerRadius={58}
                outerRadius={86}
                paddingAngle={3}
              >
                {data.map((entry, index) => (
                  <Cell fill={chartColors[index % chartColors.length]} key={entry.name} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => formatNumber(Number(value))} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="mt-5 text-sm text-slate-500">No data for this period.</p>
      )}
    </Card>
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
          cache: "no-store",
          signal: controller.signal,
        });
        const payload: unknown = await response.json().catch(() => {
          throw new Error("The analytics service returned an unreadable response.");
        });
        if (!response.ok) {
          throw new Error(
            isRecord(payload) && typeof payload.error === "string"
              ? payload.error
              : "Unable to load analytics right now.",
          );
        }
        if (!isAnalyticsData(payload)) {
          throw new Error("The analytics service returned data in an unexpected format.");
        }
        setData(payload);
      } catch (loadError) {
        if (controller.signal.aborted) return;
        setData(null);
        setError(loadError instanceof Error ? loadError.message : "Unable to load analytics.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void loadAnalytics();
    return () => controller.abort();
  }, [range, retryCount]);

  const revenueChanges = data?.changes.revenueByCurrency ?? [];
  const aovChanges = data?.changes.averageOrderValueByCurrency ?? [];
  const trend =
    data?.trend.map((point) => ({
      ...point,
      label: formatTimestamp(point.timestamp, range),
      ...Object.fromEntries(
        point.revenueByCurrency.map(({ currency, totalCents }) => [
          `revenue_${currency}`,
          totalCents / 100,
        ]),
      ),
    })) ?? [];
  const currencies = Array.from(
    new Set(
      data?.trend.flatMap((point) => point.revenueByCurrency.map(({ currency }) => currency)) ?? [],
    ),
  );
  const kpis = data
    ? [
        {
          label: "Active users",
          value: formatNumber(data.summary.activeUsers),
          change: data.changes.activeUsers,
          currencyChanges: null,
          icon: UsersRound,
          tone: "text-blue-700 bg-blue-50",
        },
        {
          label: "Pageviews",
          value: formatNumber(data.summary.pageviews),
          change: data.changes.pageviews,
          currencyChanges: null,
          icon: Activity,
          tone: "text-violet-700 bg-violet-50",
        },
        {
          label: "Paid revenue",
          value: formatCurrencyMetrics(data.commerce.revenueByCurrency),
          change: revenueChanges.length === 1 ? revenueChanges[0].percent : null,
          currencyChanges: revenueChanges.length > 1 ? revenueChanges : null,
          icon: BarChart3,
          tone: "text-emerald-700 bg-emerald-50",
        },
        {
          label: "Conversion rate",
          value: `${numberFormatter.format(data.commerce.conversionRate)}%`,
          change: data.changes.conversionRate,
          currencyChanges: null,
          icon: ArrowRight,
          tone: "text-amber-700 bg-amber-50",
        },
        {
          label: "Average order value",
          value: formatCurrencyMetrics(data.commerce.averageOrderValueByCurrency),
          change: aovChanges.length === 1 ? aovChanges[0].percent : null,
          currencyChanges: aovChanges.length > 1 ? aovChanges : null,
          icon: ShoppingBag,
          tone: "text-rose-700 bg-rose-50",
        },
      ]
    : [];

  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
      initial={{ opacity: 0, y: 12 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
    >
      <header className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.16em] text-[#718126]">
            Business intelligence
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-[-.04em] text-slate-950 sm:text-4xl">
            Analytics
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
            Understand storefront traffic and connect it to paid orders and product performance.
          </p>
        </div>
        <div
          aria-label="Analytics date range"
          className="inline-flex w-fit rounded-xl border border-slate-200 bg-white p-1 shadow-sm"
          role="group"
        >
          {ranges.map(({ value, label }) => (
            <button
              aria-pressed={range === value}
              className={`rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${range === value ? "bg-[#171a14] text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"}`}
              key={value}
              onClick={() => setRange(value)}
              type="button"
            >
              {label}
            </button>
          ))}
        </div>
      </header>
      {range === "24h" && (
        <p className="text-xs text-slate-500">
          GA4 date reporting uses the last completed reporting day for this view.
        </p>
      )}

      {error && (
        <div
          aria-live="polite"
          className="flex flex-col gap-3 rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-900 sm:flex-row sm:items-center sm:justify-between"
          role="alert"
        >
          <div>
            <h2 className="font-bold">Analytics unavailable</h2>
            <p className="mt-1">{error}</p>
          </div>
          <button
            className="min-h-10 shrink-0 rounded-lg border border-rose-300 bg-white px-4 font-semibold hover:bg-rose-100"
            onClick={() => setRetryCount((count) => count + 1)}
            type="button"
          >
            Try again
          </button>
        </div>
      )}

      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            key="loading"
            initial={{ opacity: 0 }}
          >
            <LoadingSkeleton />
          </motion.div>
        ) : data ? (
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
            initial={{ opacity: 0, y: 8 }}
            key={`${range}-data`}
            transition={{ duration: 0.25 }}
          >
            <section
              aria-label="Analytics key performance indicators"
              className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5"
            >
              {kpis.map(({ label, value, change, currencyChanges, icon: Icon, tone }, index) => (
                <motion.article
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                  initial={{ opacity: 0, y: 10 }}
                  key={label}
                  transition={{ delay: index * 0.04, duration: 0.25 }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-sm font-semibold text-slate-500">{label}</span>
                    <span className={`grid h-9 w-9 place-items-center rounded-xl ${tone}`}>
                      <Icon aria-hidden="true" className="h-4 w-4" />
                    </span>
                  </div>
                  <p
                    className="mt-4 truncate text-2xl font-black tracking-tight text-slate-950"
                    title={value}
                  >
                    {value}
                  </p>
                  <div className="mt-3 flex min-h-7 items-center gap-2">
                    {currencyChanges ? (
                      <CurrencyChangeBadges changes={currencyChanges} />
                    ) : (
                      <ChangeBadge value={change} />
                    )}
                  </div>
                  <span className="mt-1 block text-xs text-slate-500">vs previous period</span>
                </motion.article>
              ))}
            </section>

            <section aria-labelledby="traffic-heading" className="space-y-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[.14em] text-[#718126]">
                  Acquisition & engagement
                </p>
                <h2 className="mt-1 text-xl font-black text-slate-950" id="traffic-heading">
                  Storefront Traffic{" "}
                  <span className="font-semibold text-slate-400">(Google Analytics)</span>
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {formatNumber(data.summary.sessions)} sessions · average session{" "}
                  {formatDuration(data.summary.averageSessionDuration)}
                </p>
              </div>
              <div className="grid gap-6 xl:grid-cols-2">
                <Card>
                  <h3 className="font-bold text-slate-900">Traffic vs. paid orders</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Pageviews and paid order counts over time.
                  </p>
                  <div className="mt-5 h-80">
                    {trend.length ? (
                      <ResponsiveContainer height="100%" width="100%">
                        <ComposedChart
                          data={trend}
                          margin={{ top: 8, right: 4, left: -18, bottom: 0 }}
                        >
                          <CartesianGrid stroke="#edf0f3" strokeDasharray="4 4" vertical={false} />
                          <XAxis
                            axisLine={false}
                            dataKey="label"
                            minTickGap={28}
                            tick={{ fill: "#64748b", fontSize: 11 }}
                            tickLine={false}
                          />
                          <YAxis
                            yAxisId="traffic"
                            allowDecimals={false}
                            axisLine={false}
                            tick={{ fill: "#64748b", fontSize: 11 }}
                            tickLine={false}
                            width={46}
                          />
                          <YAxis
                            yAxisId="orders"
                            allowDecimals={false}
                            axisLine={false}
                            orientation="right"
                            tick={{ fill: "#64748b", fontSize: 11 }}
                            tickLine={false}
                            width={38}
                          />
                          <Tooltip />
                          <Legend />
                          <Line
                            dataKey="pageviews"
                            name="Pageviews"
                            stroke="#3182ce"
                            strokeWidth={2.5}
                            type="monotone"
                            yAxisId="traffic"
                            dot={false}
                          />
                          <Line
                            dataKey="activeUsers"
                            name="Active users"
                            stroke="#8b5cf6"
                            strokeWidth={2}
                            type="monotone"
                            yAxisId="traffic"
                            dot={false}
                          />
                          <Line
                            dataKey="paidOrders"
                            name="Paid orders"
                            stroke="#718126"
                            strokeWidth={2.5}
                            type="monotone"
                            yAxisId="orders"
                            dot={{ r: 3 }}
                          />
                        </ComposedChart>
                      </ResponsiveContainer>
                    ) : (
                      <p className="grid h-full place-items-center text-sm text-slate-500">
                        No traffic data for this period.
                      </p>
                    )}
                  </div>
                </Card>
                <Card>
                  <h3 className="font-bold text-slate-900">Revenue trend</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Paid order revenue remains separated by currency.
                  </p>
                  <div className="mt-5 h-80">
                    {trend.length && currencies.length ? (
                      <ResponsiveContainer height="100%" width="100%">
                        <ComposedChart
                          data={trend}
                          margin={{ top: 8, right: 8, left: -12, bottom: 0 }}
                        >
                          <CartesianGrid stroke="#edf0f3" strokeDasharray="4 4" vertical={false} />
                          <XAxis
                            axisLine={false}
                            dataKey="label"
                            minTickGap={28}
                            tick={{ fill: "#64748b", fontSize: 11 }}
                            tickLine={false}
                          />
                          <YAxis
                            axisLine={false}
                            tick={{ fill: "#64748b", fontSize: 11 }}
                            tickLine={false}
                            width={52}
                          />
                          <Tooltip
                            formatter={(value) =>
                              Number(value).toLocaleString("en-US", { maximumFractionDigits: 2 })
                            }
                          />
                          <Legend />
                          {currencies.map((currency, index) => (
                            <Line
                              dataKey={`revenue_${currency}`}
                              dot={false}
                              key={currency}
                              name={currency}
                              stroke={chartColors[index % chartColors.length]}
                              strokeWidth={2.5}
                              type="monotone"
                            />
                          ))}
                        </ComposedChart>
                      </ResponsiveContainer>
                    ) : (
                      <p className="grid h-full place-items-center text-sm text-slate-500">
                        No paid revenue for this period.
                      </p>
                    )}
                  </div>
                </Card>
              </div>
              <div className="grid gap-6 md:grid-cols-3">
                <BreakdownPie metrics={data.devices} title="Device categories" />
                <BreakdownPie metrics={data.browsers} title="Browsers" />
                <MetricBars metrics={data.operatingSystems} title="Operating systems" />
              </div>
              <div className="grid gap-6 xl:grid-cols-2">
                <MetricBars metrics={data.topPages} title="Top pages" />
                <div className="grid gap-6 sm:grid-cols-2">
                  <MetricBars metrics={data.countries} title="Top countries" />
                  <MetricBars metrics={data.cities} title="Top cities" />
                </div>
              </div>
            </section>

            <section aria-labelledby="commerce-heading" className="space-y-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[.14em] text-[#718126]">
                  Orders & products
                </p>
                <h2 className="mt-1 text-xl font-black text-slate-950" id="commerce-heading">
                  Commerce Performance{" "}
                  <span className="font-semibold text-slate-400">(Database)</span>
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Conversion is paid orders divided by GA4 sessions. Revenue and average order value
                  are grouped by currency.
                </p>
              </div>
              <div className="grid gap-6 xl:grid-cols-2">
                <Card>
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h3 className="font-bold text-slate-900">Top selling products</h3>
                      <p className="mt-1 text-sm text-slate-500">
                        Units sold with matching product-page views.
                      </p>
                    </div>
                    <ShoppingBag aria-hidden="true" className="h-5 w-5 text-slate-400" />
                  </div>
                  {data.topProducts.length ? (
                    <div className="mt-5 overflow-x-auto">
                      <table className="w-full min-w-[540px] text-left text-sm">
                        <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                          <tr>
                            <th className="pb-3 pr-3">Product</th>
                            <th className="pb-3 pr-3 text-right">Units</th>
                            <th className="pb-3 pr-3 text-right">Page views</th>
                            <th className="pb-3 text-right">Sales</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {data.topProducts.map((product) => (
                            <tr key={`${product.slug}-${product.currency}`}>
                              <td
                                className="max-w-48 truncate py-3 pr-3 font-semibold text-slate-800"
                                title={product.name}
                              >
                                {product.name}
                              </td>
                              <td className="py-3 pr-3 text-right tabular-nums">
                                {formatNumber(product.quantity)}
                              </td>
                              <td className="py-3 pr-3 text-right tabular-nums">
                                {formatNumber(product.productViews)}
                              </td>
                              <td className="py-3 text-right tabular-nums">
                                {formatMoney(product.revenueCents, product.currency)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="mt-5 rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
                      No paid product sales for this period.
                    </p>
                  )}
                </Card>
                <Card>
                  <h3 className="font-bold text-slate-900">Geographical reach</h3>
                  <p className="mt-1 text-sm text-slate-500">Active users by country and city.</p>
                  <div className="mt-5 grid gap-6 sm:grid-cols-2">
                    {[
                      { title: "Countries", metrics: data.countries },
                      { title: "Cities", metrics: data.cities },
                    ].map(({ title, metrics }) => (
                      <div key={title}>
                        <h4 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-700">
                          <Globe2 aria-hidden="true" className="h-4 w-4 text-[#718126]" /> {title}
                        </h4>
                        <ul className="space-y-2">
                          {metrics.slice(0, 5).map(({ name, value }) => (
                            <li className="flex justify-between gap-3 text-sm" key={name}>
                              <span className="truncate text-slate-600" title={name}>
                                {name}
                              </span>
                              <span className="shrink-0 font-semibold tabular-nums text-slate-800">
                                {formatNumber(value)}
                              </span>
                            </li>
                          ))}
                          {!metrics.length && (
                            <li className="text-sm text-slate-500">No data for this period.</li>
                          )}
                        </ul>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
              <p className="flex items-center gap-2 text-xs text-slate-500">
                <MonitorSmartphone aria-hidden="true" className="h-4 w-4" />
                GA4 reporting is cached for 10 minutes. Revenue includes paid orders only; refunds
                and taxes are not separately deducted.
              </p>
            </section>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.div>
  );
}
