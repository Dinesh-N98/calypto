import "server-only";
import type {
  AnalyticsDashboardData,
  AnalyticsMetric,
  AnalyticsRange,
  AnalyticsUnit,
} from "@/lib/analytics-types";

export class VercelAnalyticsError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "VercelAnalyticsError";
  }
}

type VercelDimension =
  | "hour"
  | "day"
  | "requestPath"
  | "country"
  | "deviceType"
  | "osName"
  | "referrerHostname";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readCount(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new VercelAnalyticsError(`Vercel returned invalid ${label} data.`, 502);
  }
  return value;
}

function readMetricValue(row: Record<string, unknown>, label: string): number {
  if ("pageviews" in row) return readCount(row.pageviews, label);
  if ("count" in row) return readCount(row.count, label);
  throw new VercelAnalyticsError(`Vercel returned invalid ${label} data.`, 502);
}

function readAggregateRows(value: unknown, label: string): Array<Record<string, unknown>> {
  if (!isRecord(value) || !Array.isArray(value.data)) {
    throw new VercelAnalyticsError(`Vercel returned invalid ${label} data.`, 502);
  }
  if (!value.data.every(isRecord)) {
    throw new VercelAnalyticsError(`Vercel returned invalid ${label} data.`, 502);
  }
  return value.data;
}

function readSummary(value: unknown): AnalyticsDashboardData["summary"] {
  if (!isRecord(value) || !isRecord(value.data)) {
    throw new VercelAnalyticsError("Vercel returned invalid summary data.", 502);
  }
  return {
    visitors: readCount(value.data.visitors, "visitor summary"),
    pageviews: readCount(value.data.pageviews, "pageview summary"),
  };
}

function getConfiguration() {
  const accessToken = process.env.VERCEL_ACCESS_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;

  if (!accessToken || !projectId) {
    throw new VercelAnalyticsError(
      "Vercel analytics credentials are not configured. Set VERCEL_ACCESS_TOKEN and VERCEL_PROJECT_ID.",
      503,
    );
  }

  return {
    accessToken,
    projectId,
    teamId: process.env.VERCEL_TEAM_ID,
    teamSlug: process.env.VERCEL_TEAM_SLUG,
  };
}

async function requestVercel(
  endpoint: "visits/count" | "visits/aggregate",
  params: URLSearchParams,
): Promise<unknown> {
  const { accessToken, projectId, teamId, teamSlug } = getConfiguration();
  params.set("projectId", projectId);
  if (teamId) params.set("teamId", teamId);
  else if (teamSlug) params.set("slug", teamSlug);

  let response: Response;
  try {
    response = await fetch(
      `https://api.vercel.com/v1/query/web-analytics/${endpoint}?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
        cache: "no-store",
        signal: AbortSignal.timeout(10_000),
      },
    );
  } catch {
    throw new VercelAnalyticsError("Unable to reach the Vercel analytics service.", 502);
  }

  if (!response.ok) {
    throw new VercelAnalyticsError(
      `Vercel analytics request failed with status ${response.status}.`,
      502,
    );
  }

  try {
    return await response.json();
  } catch {
    throw new VercelAnalyticsError("Vercel returned an invalid response.", 502);
  }
}

function baseParams(since: string, until: string): URLSearchParams {
  return new URLSearchParams({ since, until, limit: "100" });
}

async function fetchDimension(
  dimension: Exclude<VercelDimension, "hour" | "day">,
  since: string,
  until: string,
): Promise<AnalyticsMetric[]> {
  const params = baseParams(since, until);
  params.set("by", dimension);
  const rows = readAggregateRows(
    await requestVercel("visits/aggregate", params),
    `${dimension} breakdown`,
  );

  return rows.map((row) => {
    const label = row[dimension];
    if (label !== null && typeof label !== "string") {
      throw new VercelAnalyticsError(`Vercel returned invalid ${dimension} breakdown data.`, 502);
    }
    const name =
      typeof label === "string"
        ? label
        : dimension === "referrerHostname"
          ? "(direct)"
          : "Unknown";
    return { name, value: readMetricValue(row, `${dimension} breakdown`) };
  });
}

async function fetchPageviews(
  unit: AnalyticsUnit,
  since: string,
  until: string,
): Promise<AnalyticsDashboardData["pageviews"]> {
  const params = baseParams(since, until);
  params.set("by", unit);
  const rows = readAggregateRows(
    await requestVercel("visits/aggregate", params),
    "pageview trend",
  );

  return rows.map((row) => {
    if (typeof row.timestamp !== "string") {
      throw new VercelAnalyticsError("Vercel returned invalid pageview trend data.", 502);
    }
    return {
      timestamp: row.timestamp,
      pageviews: readMetricValue(row, "pageview trend"),
    };
  });
}

export async function getVercelAnalytics(
  range: AnalyticsRange,
  startAt: number,
  endAt: number,
  unit: AnalyticsUnit,
): Promise<AnalyticsDashboardData> {
  const since = new Date(startAt).toISOString();
  const until = new Date(endAt).toISOString();
  const countParams = new URLSearchParams({ since, until });

  const [summaryResponse, pageviews, topPages, countries, devices, operatingSystems, referrers] =
    await Promise.all([
      requestVercel("visits/count", countParams),
      fetchPageviews(unit, since, until),
      fetchDimension("requestPath", since, until),
      fetchDimension("country", since, until),
      fetchDimension("deviceType", since, until),
      fetchDimension("osName", since, until),
      fetchDimension("referrerHostname", since, until),
    ]);

  const productViews = topPages.filter((page) => {
    try {
      const pathname = new URL(page.name, "https://calyptobait.com").pathname;
      return pathname.startsWith("/shop/") && pathname !== "/shop/";
    } catch {
      return false;
    }
  });

  return {
    range,
    startAt,
    endAt,
    unit,
    summary: readSummary(summaryResponse),
    pageviews,
    topPages,
    productViews,
    countries,
    cities: [],
    devices,
    operatingSystems,
    referrers,
  };
}
