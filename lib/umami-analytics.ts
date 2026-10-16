import "server-only";

export type AnalyticsRange = "24h" | "7d" | "30d";
export type AnalyticsUnit = "hour" | "day";

export type AnalyticsMetric = {
  name: string;
  value: number;
};

export type AnalyticsDashboardData = {
  range: AnalyticsRange;
  startAt: number;
  endAt: number;
  unit: AnalyticsUnit;
  summary: {
    visitors: number;
    pageviews: number;
  };
  pageviews: Array<{ timestamp: string; pageviews: number }>;
  topPages: AnalyticsMetric[];
  productViews: AnalyticsMetric[];
  countries: AnalyticsMetric[];
  cities: AnalyticsMetric[];
  devices: AnalyticsMetric[];
  operatingSystems: AnalyticsMetric[];
  referrers: AnalyticsMetric[];
};

export class UmamiAnalyticsError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "UmamiAnalyticsError";
  }
}

type MetricType = "url" | "country" | "city" | "device" | "os" | "referrer";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readNumber(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new UmamiAnalyticsError(`Umami returned invalid ${label} data.`, 502);
  }
  return value;
}

function readMetrics(value: unknown, label: string): AnalyticsMetric[] {
  if (!Array.isArray(value)) {
    throw new UmamiAnalyticsError(`Umami returned invalid ${label} data.`, 502);
  }

  return value.map((item) => {
    if (!isRecord(item) || typeof item.x !== "string") {
      throw new UmamiAnalyticsError(`Umami returned invalid ${label} data.`, 502);
    }
    return { name: item.x, value: readNumber(item.y, label) };
  });
}

function readPageviews(value: unknown): Array<{ timestamp: string; pageviews: number }> {
  if (!isRecord(value) || !Array.isArray(value.pageviews)) {
    throw new UmamiAnalyticsError("Umami returned invalid pageview trend data.", 502);
  }

  return value.pageviews.map((item) => {
    if (!isRecord(item) || (typeof item.x !== "string" && typeof item.x !== "number")) {
      throw new UmamiAnalyticsError("Umami returned invalid pageview trend data.", 502);
    }
    return {
      timestamp: String(item.x),
      pageviews: readNumber(item.y, "pageview trend"),
    };
  });
}

function getConfiguration() {
  const apiKey = process.env.UMAMI_API_KEY;
  const websiteId = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID;
  const hostUrl = process.env.UMAMI_HOST_URL;

  if (!apiKey || !websiteId || !hostUrl) {
    throw new UmamiAnalyticsError("Umami analytics credentials are not configured.", 503);
  }

  let host: URL;
  try {
    host = new URL(hostUrl);
  } catch {
    throw new UmamiAnalyticsError("Umami analytics host URL is invalid.", 503);
  }
  if (
    host.protocol !== "https:" ||
    host.username ||
    host.password ||
    (host.pathname !== "/" && host.pathname !== "") ||
    host.search ||
    host.hash
  ) {
    throw new UmamiAnalyticsError("Umami analytics host URL must be a valid HTTPS origin.", 503);
  }

  return { apiKey, websiteId, hostUrl: host.origin };
}

async function requestUmami<T>(
  path: string,
  params: URLSearchParams,
  parse: (value: unknown) => T,
): Promise<T> {
  const { apiKey, websiteId, hostUrl } = getConfiguration();
  const url = new URL(
    `/v1/websites/${encodeURIComponent(websiteId)}/${path}`,
    `${hostUrl}/`,
  );
  url.search = params.toString();

  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        "x-umami-api-key": apiKey,
        Accept: "application/json",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw new UmamiAnalyticsError("Unable to reach the Umami analytics service.", 502);
  }

  if (!response.ok) {
    throw new UmamiAnalyticsError(
      `Umami analytics request failed with status ${response.status}.`,
      502,
    );
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new UmamiAnalyticsError("Umami returned an invalid response.", 502);
  }
  return parse(payload);
}

function rangeParams(startAt: number, endAt: number): URLSearchParams {
  return new URLSearchParams({
    startAt: String(startAt),
    endAt: String(endAt),
  });
}

async function fetchMetrics(
  type: MetricType,
  startAt: number,
  endAt: number,
): Promise<AnalyticsMetric[]> {
  const params = rangeParams(startAt, endAt);
  params.set("type", type);
  params.set("limit", "100");
  return requestUmami("metrics", params, (value) => readMetrics(value, `${type} metrics`));
}

export async function getUmamiAnalytics(
  range: AnalyticsRange,
  startAt: number,
  endAt: number,
  unit: AnalyticsUnit,
): Promise<AnalyticsDashboardData> {
  const period = rangeParams(startAt, endAt);
  const trendParams = rangeParams(startAt, endAt);
  trendParams.set("unit", unit);

  const [summary, pageviews, topPages, countries, cities, devices, operatingSystems, referrers] =
    await Promise.all([
      requestUmami("stats", period, (value) => {
        if (!isRecord(value)) {
          throw new UmamiAnalyticsError("Umami returned invalid summary data.", 502);
        }
        return {
          visitors: readNumber(value.visitors, "visitor summary"),
          pageviews: readNumber(value.pageviews, "pageview summary"),
        };
      }),
      requestUmami("pageviews", trendParams, readPageviews),
      fetchMetrics("url", startAt, endAt),
      fetchMetrics("country", startAt, endAt),
      fetchMetrics("city", startAt, endAt),
      fetchMetrics("device", startAt, endAt),
      fetchMetrics("os", startAt, endAt),
      fetchMetrics("referrer", startAt, endAt),
    ]);

  const productViews = topPages.filter((page) => {
    try {
      const path = new URL(page.name, "https://calyptobait.com").pathname;
      return path.startsWith("/shop/") && path !== "/shop/";
    } catch {
      return false;
    }
  });

  return {
    range,
    startAt,
    endAt,
    unit,
    summary,
    pageviews,
    topPages,
    productViews,
    countries,
    cities,
    devices,
    operatingSystems,
    referrers,
  };
}
