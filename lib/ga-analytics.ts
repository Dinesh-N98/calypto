import "server-only";
import { BetaAnalyticsDataClient, type protos } from "@google-analytics/data";
import { unstable_cache } from "next/cache";
import type {
  AnalyticsDashboardData,
  AnalyticsMetric,
  AnalyticsRange,
  CurrencyMetric,
} from "@/lib/analytics-types";
import { getGaCredentials } from "@/lib/ga-credentials";
import { prisma } from "@/lib/prisma";

type ReportRow = {
  dimensionValues?: Array<{ value?: string | null } | null> | null;
  metricValues?: Array<{ value?: string | null } | null> | null;
};

type ReportResponse = {
  metadata?: { timeZone?: string | null } | null;
  rows?: ReportRow[] | null;
};

type GaMetric = "activeUsers" | "screenPageViews" | "sessions" | "averageSessionDuration";
type GaFilterExpression = protos.google.analytics.data.v1beta.IFilterExpression;
type GaDimension =
  | "date"
  | "dateHour"
  | "pagePathPlusQueryString"
  | "pagePath"
  | "deviceCategory"
  | "browser"
  | "operatingSystem"
  | "country"
  | "city";

type Period = {
  startDate: string;
  endDate: string;
  startAt: Date;
  endAt: Date;
};

type CommerceSummaryRow = {
  currency: string;
  currentOrders: number;
  currentRevenueCents: bigint | number | null;
  previousOrders: number;
  previousRevenueCents: bigint | number | null;
};

type CommerceTrendRow = {
  timestamp: string;
  currency: string;
  paidOrders: number;
  revenueCents: bigint | number | null;
};

type TopProductRow = {
  slug: string;
  name: string;
  quantity: number;
  revenueCents: bigint | number | null;
  currency: string;
};

const cacheDurationSeconds = 10 * 60;
const breakdownLimit = 100;
const topProductLimit = 10;
let cachedClient: { client: BetaAnalyticsDataClient; property: string } | undefined;

function getClient(): { client: BetaAnalyticsDataClient; property: string } {
  if (!cachedClient) {
    const credentials = getGaCredentials();
    cachedClient = {
      client: new BetaAnalyticsDataClient({
        credentials: {
          client_email: credentials.clientEmail,
          private_key: credentials.privateKey,
        },
      }),
      property: credentials.property,
    };
  }
  return cachedClient;
}

function getPeriods(
  range: AnalyticsRange,
  now = new Date(),
  timeZone = "UTC",
): { current: Period; previous: Period } {
  const days = range === "24h" ? 1 : range === "7d" ? 7 : 30;
  const dateParts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .formatToParts(now)
    .reduce<Record<string, string>>((parts, part) => {
      parts[part.type] = part.value;
      return parts;
    }, {});
  const today = `${dateParts.year}-${dateParts.month}-${dateParts.day}`;
  const shiftDate = (date: string, offset: number) => {
    const shifted = new Date(`${date}T00:00:00.000Z`);
    shifted.setUTCDate(shifted.getUTCDate() + offset);
    return shifted.toISOString().slice(0, 10);
  };
  const startOfDay = (date: string) => {
    const targetWallTime = Date.parse(`${date}T00:00:00.000Z`);
    let instant = targetWallTime;
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    });
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const parts = formatter
        .formatToParts(new Date(instant))
        .reduce<Record<string, string>>((result, part) => {
          result[part.type] = part.value;
          return result;
        }, {});
      const actualWallTime = Date.UTC(
        Number(parts.year),
        Number(parts.month) - 1,
        Number(parts.day),
        Number(parts.hour),
        Number(parts.minute),
        Number(parts.second),
      );
      instant += targetWallTime - actualWallTime;
    }
    return new Date(instant);
  };
  const currentStartDate = shiftDate(today, range === "24h" ? -1 : -(days - 1));
  const previousStartDate = shiftDate(today, range === "24h" ? -2 : -(days * 2 - 1));
  const currentStart = startOfDay(currentStartDate);
  const previousStart = startOfDay(previousStartDate);
  const currentEnd = range === "24h" ? startOfDay(today) : now;

  return {
    current: {
      startAt: currentStart,
      endAt: currentEnd,
      startDate: range === "24h" ? "yesterday" : `${days - 1}daysAgo`,
      endDate: range === "24h" ? "yesterday" : "today",
    },
    previous: {
      startAt: previousStart,
      endAt: currentStart,
      startDate: range === "24h" ? "2daysAgo" : `${days * 2 - 1}daysAgo`,
      endDate: range === "24h" ? "2daysAgo" : `${days}daysAgo`,
    },
  };
}

async function runReport(
  period: Period,
  dimensions: GaDimension[],
  metrics: GaMetric[],
  limit = breakdownLimit,
  dimensionFilter?: GaFilterExpression,
): Promise<ReportResponse> {
  const { client, property } = getClient();
  const [response] = await client.runReport({
    property,
    dateRanges: [{ startDate: period.startDate, endDate: period.endDate }],
    dimensions: dimensions.map((name) => ({ name })),
    metrics: metrics.map((name) => ({ name })),
    limit,
    ...(dimensionFilter ? { dimensionFilter } : {}),
    ...(metrics.length === 1
      ? { orderBys: [{ metric: { metricName: metrics[0] }, desc: true }] }
      : {}),
  });
  return response;
}

function numberAt(row: ReportRow | undefined, index: number): number {
  const value = Number(row?.metricValues?.[index]?.value ?? 0);
  return Number.isFinite(value) ? value : 0;
}

function dimensionAt(row: ReportRow | undefined, index: number): string {
  return row?.dimensionValues?.[index]?.value ?? "";
}

function rowsOf(response: ReportResponse): ReportRow[] {
  return response.rows ?? [];
}

function normalizeTrendTimestamp(value: string, range: AnalyticsRange): string {
  if (range === "24h" && /^\d{10}$/.test(value)) {
    return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)} ${value.slice(8, 10)}:00`;
  }
  if (/^\d{8}$/.test(value)) {
    return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
  }
  return value;
}

function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / previous) * 100;
}

function addCurrencyMetric(values: Map<string, number>, currency: string, amount: number): void {
  values.set(currency, (values.get(currency) ?? 0) + amount);
}

function asCurrencyMetrics(values: Map<string, number>): CurrencyMetric[] {
  return Array.from(values, ([currency, totalCents]) => ({ currency, totalCents })).sort(
    (left, right) => left.currency.localeCompare(right.currency),
  );
}

function compareCurrencies(
  current: Map<string, number>,
  previous: Map<string, number>,
): Array<{ currency: string; percent: number | null }> {
  return Array.from(new Set([...current.keys(), ...previous.keys()]))
    .sort()
    .map((currency) => ({
      currency,
      percent: percentChange(current.get(currency) ?? 0, previous.get(currency) ?? 0),
    }));
}

async function getCommerceData(
  current: Period,
  previous: Period,
  range: AnalyticsRange,
  timeZone: string,
): Promise<{
  summaryRows: CommerceSummaryRow[];
  trendRows: CommerceTrendRow[];
  products: TopProductRow[];
}> {
  const bucket = range === "24h" ? "hour" : "day";
  const timestampFormat = range === "24h" ? "YYYY-MM-DD HH24:00" : "YYYY-MM-DD";
  const [summaryRows, trendRows, products] = await Promise.all([
    prisma.$queryRaw<CommerceSummaryRow[]>`
      SELECT
        "currency",
        COUNT(*) FILTER (WHERE "createdAt" >= ${current.startAt} AND "createdAt" < ${current.endAt})::int AS "currentOrders",
        COALESCE(SUM("totalCents") FILTER (WHERE "createdAt" >= ${current.startAt} AND "createdAt" < ${current.endAt}), 0)::bigint AS "currentRevenueCents",
        COUNT(*) FILTER (WHERE "createdAt" >= ${previous.startAt} AND "createdAt" < ${previous.endAt})::int AS "previousOrders",
        COALESCE(SUM("totalCents") FILTER (WHERE "createdAt" >= ${previous.startAt} AND "createdAt" < ${previous.endAt}), 0)::bigint AS "previousRevenueCents"
      FROM "Order"
      WHERE "status" = 'paid'
        AND "createdAt" >= ${previous.startAt}
        AND "createdAt" < ${current.endAt}
      GROUP BY "currency"
    `,
    prisma.$queryRaw<CommerceTrendRow[]>`
      SELECT
        to_char(date_trunc(${bucket}, "createdAt" AT TIME ZONE ${timeZone}), ${timestampFormat}) AS "timestamp",
        "currency",
        COUNT(*)::int AS "paidOrders",
        COALESCE(SUM("totalCents"), 0)::bigint AS "revenueCents"
      FROM "Order"
      WHERE "status" = 'paid'
        AND "createdAt" >= ${current.startAt}
        AND "createdAt" < ${current.endAt}
      GROUP BY 1, "currency"
      ORDER BY 1 ASC
    `,
    prisma.$queryRaw<TopProductRow[]>`
      SELECT
        item."productSlug" AS "slug",
        MIN(item."name") AS "name",
        SUM(item."quantity")::int AS "quantity",
        COALESCE(SUM(item."priceCents" * item."quantity"), 0)::bigint AS "revenueCents",
        order_record."currency"
      FROM "OrderItem" AS item
      INNER JOIN "Order" AS order_record ON order_record."id" = item."orderId"
      WHERE order_record."status" = 'paid'
        AND order_record."createdAt" >= ${current.startAt}
        AND order_record."createdAt" < ${current.endAt}
      GROUP BY item."productSlug", order_record."currency"
      ORDER BY SUM(item."quantity") DESC, SUM(item."priceCents" * item."quantity") DESC
      LIMIT ${topProductLimit}
    `,
  ]);

  return { summaryRows, trendRows, products };
}

function toMetricList(response: ReportResponse): AnalyticsMetric[] {
  return rowsOf(response)
    .map((row) => ({ name: dimensionAt(row, 0), value: numberAt(row, 0) }))
    .filter((metric) => metric.name.length > 0)
    .sort((left, right) => right.value - left.value);
}

function pagePath(page: string): string {
  try {
    return new URL(page, "https://calyptobait.com").pathname;
  } catch {
    return page.split("?")[0];
  }
}

async function buildAnalytics(range: AnalyticsRange): Promise<AnalyticsDashboardData> {
  const now = new Date();
  const initialPeriod = getPeriods(range, now);
  const currentSummary = await runReport(
    initialPeriod.current,
    [],
    ["activeUsers", "screenPageViews", "sessions", "averageSessionDuration"],
    1,
  );
  const timeZone = currentSummary.metadata?.timeZone || "UTC";
  const { current, previous } = getPeriods(range, now, timeZone);
  const [previousSummary, gaTrend, pages, devices, browsers, systems, countries, cities, commerce] =
    await Promise.all([
      runReport(
        previous,
        [],
        ["activeUsers", "screenPageViews", "sessions", "averageSessionDuration"],
        1,
      ),
      runReport(
        current,
        [range === "24h" ? "dateHour" : "date"],
        ["activeUsers", "screenPageViews"],
        100,
      ),
      runReport(current, ["pagePathPlusQueryString"], ["screenPageViews"]),
      runReport(current, ["deviceCategory"], ["activeUsers"], 10),
      runReport(current, ["browser"], ["activeUsers"], 20),
      runReport(current, ["operatingSystem"], ["activeUsers"], 20),
      runReport(current, ["country"], ["activeUsers"], breakdownLimit),
      runReport(current, ["city"], ["activeUsers"], breakdownLimit),
      getCommerceData(current, previous, range, timeZone),
    ]);

  const productPages = commerce.products.length
    ? await runReport(current, ["pagePath"], ["screenPageViews"], topProductLimit, {
        orGroup: {
          expressions: commerce.products.map((product) => ({
            filter: {
              fieldName: "pagePath",
              stringFilter: {
                matchType: "EXACT",
                value: `/shop/${product.slug}`,
              },
            },
          })),
        },
      })
    : { rows: [] };

  const currentSummaryRow = rowsOf(currentSummary)[0];
  const previousSummaryRow = rowsOf(previousSummary)[0];
  const currentUsers = numberAt(currentSummaryRow, 0);
  const currentPageviews = numberAt(currentSummaryRow, 1);
  const currentSessions = numberAt(currentSummaryRow, 2);
  const previousUsers = numberAt(previousSummaryRow, 0);
  const previousPageviews = numberAt(previousSummaryRow, 1);

  const revenueByCurrency = new Map<string, number>();
  const previousRevenueByCurrency = new Map<string, number>();
  const averageOrderValueByCurrency = new Map<string, number>();
  let paidOrders = 0;
  let previousPaidOrders = 0;
  for (const row of commerce.summaryRows) {
    const currentRevenue = Number(row.currentRevenueCents ?? 0);
    const previousRevenue = Number(row.previousRevenueCents ?? 0);
    const currentOrderCount = Number(row.currentOrders ?? 0);
    const previousOrderCount = Number(row.previousOrders ?? 0);
    paidOrders += currentOrderCount;
    previousPaidOrders += previousOrderCount;
    if (currentRevenue > 0 || currentOrderCount > 0) {
      addCurrencyMetric(revenueByCurrency, row.currency, currentRevenue);
    }
    if (previousRevenue > 0 || previousOrderCount > 0) {
      addCurrencyMetric(previousRevenueByCurrency, row.currency, previousRevenue);
    }
    if (currentOrderCount > 0) {
      averageOrderValueByCurrency.set(row.currency, currentRevenue / currentOrderCount);
    }
  }

  const trendByTimestamp = new Map<
    string,
    {
      timestamp: string;
      activeUsers: number;
      pageviews: number;
      paidOrders: number;
      revenueByCurrency: Map<string, number>;
    }
  >();
  for (const row of rowsOf(gaTrend)) {
    const timestamp = normalizeTrendTimestamp(dimensionAt(row, 0), range);
    if (!timestamp) continue;
    const point = trendByTimestamp.get(timestamp) ?? {
      timestamp,
      activeUsers: 0,
      pageviews: 0,
      paidOrders: 0,
      revenueByCurrency: new Map<string, number>(),
    };
    point.activeUsers += numberAt(row, 0);
    point.pageviews += numberAt(row, 1);
    trendByTimestamp.set(timestamp, point);
  }
  for (const row of commerce.trendRows) {
    const point = trendByTimestamp.get(row.timestamp) ?? {
      timestamp: row.timestamp,
      activeUsers: 0,
      pageviews: 0,
      paidOrders: 0,
      revenueByCurrency: new Map<string, number>(),
    };
    point.paidOrders += Number(row.paidOrders);
    addCurrencyMetric(point.revenueByCurrency, row.currency, Number(row.revenueCents ?? 0));
    trendByTimestamp.set(row.timestamp, point);
  }

  const productViews = toMetricList(productPages);
  const productViewBySlug = new Map(
    productViews.map(({ name, value }) => [
      pagePath(name)
        .replace(/^\/shop\//, "")
        .split("/")[0],
      value,
    ]),
  );
  const topProducts = commerce.products.map((product) => ({
    slug: product.slug,
    name: product.name,
    quantity: Number(product.quantity),
    revenueCents: Number(product.revenueCents ?? 0),
    currency: product.currency,
    productViews: productViewBySlug.get(product.slug) ?? 0,
  }));

  const averageOrderValues = asCurrencyMetrics(averageOrderValueByCurrency);
  const previousAverageOrderValueByCurrency = new Map<string, number>();
  for (const row of commerce.summaryRows) {
    const previousCount = Number(row.previousOrders ?? 0);
    if (previousCount > 0) {
      previousAverageOrderValueByCurrency.set(
        row.currency,
        Number(row.previousRevenueCents ?? 0) / previousCount,
      );
    }
  }

  return {
    range,
    startAt: current.startAt.getTime(),
    endAt: current.endAt.getTime(),
    summary: {
      activeUsers: currentUsers,
      pageviews: currentPageviews,
      sessions: currentSessions,
      averageSessionDuration: numberAt(currentSummaryRow, 3),
    },
    commerce: {
      paidOrders,
      revenueByCurrency: asCurrencyMetrics(revenueByCurrency),
      averageOrderValueByCurrency: averageOrderValues,
      conversionRate: currentSessions === 0 ? 0 : (paidOrders / currentSessions) * 100,
    },
    changes: {
      activeUsers: percentChange(currentUsers, previousUsers),
      pageviews: percentChange(currentPageviews, previousPageviews),
      conversionRate: percentChange(
        currentSessions === 0 ? 0 : (paidOrders / currentSessions) * 100,
        numberAt(previousSummaryRow, 2) === 0
          ? 0
          : (previousPaidOrders / numberAt(previousSummaryRow, 2)) * 100,
      ),
      revenueByCurrency: compareCurrencies(revenueByCurrency, previousRevenueByCurrency),
      averageOrderValueByCurrency: compareCurrencies(
        averageOrderValueByCurrency,
        previousAverageOrderValueByCurrency,
      ),
    },
    trend: Array.from(trendByTimestamp.values())
      .sort((left, right) => left.timestamp.localeCompare(right.timestamp))
      .map((point) => ({
        ...point,
        revenueByCurrency: asCurrencyMetrics(point.revenueByCurrency),
      })),
    topPages: toMetricList(pages),
    productViews,
    topProducts,
    devices: toMetricList(devices),
    browsers: toMetricList(browsers),
    operatingSystems: toMetricList(systems),
    countries: toMetricList(countries),
    cities: toMetricList(cities),
  };
}

const getCachedAnalytics = unstable_cache(
  async (range: AnalyticsRange) => buildAnalytics(range),
  ["admin-ga4-commerce-analytics-v1"],
  { revalidate: cacheDurationSeconds },
);

export function getAdminAnalytics(range: AnalyticsRange): Promise<AnalyticsDashboardData> {
  return getCachedAnalytics(range);
}
