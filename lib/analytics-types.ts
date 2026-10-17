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
