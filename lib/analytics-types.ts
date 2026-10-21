export type AnalyticsRange = "24h" | "7d" | "30d";

export type AnalyticsMetric = {
  name: string;
  value: number;
};

export type CurrencyMetric = {
  currency: string;
  totalCents: number;
};

export type MetricChange = number | null;

export type AnalyticsDashboardData = {
  range: AnalyticsRange;
  startAt: number;
  endAt: number;
  summary: {
    activeUsers: number;
    pageviews: number;
    sessions: number;
    averageSessionDuration: number;
  };
  commerce: {
    paidOrders: number;
    revenueByCurrency: CurrencyMetric[];
    averageOrderValueByCurrency: CurrencyMetric[];
    conversionRate: number;
  };
  changes: {
    activeUsers: MetricChange;
    pageviews: MetricChange;
    conversionRate: MetricChange;
    revenueByCurrency: Array<{ currency: string; percent: MetricChange }>;
    averageOrderValueByCurrency: Array<{ currency: string; percent: MetricChange }>;
  };
  trend: Array<{
    timestamp: string;
    activeUsers: number;
    pageviews: number;
    paidOrders: number;
    revenueByCurrency: CurrencyMetric[];
  }>;
  topPages: AnalyticsMetric[];
  productViews: AnalyticsMetric[];
  topProducts: Array<{
    slug: string;
    name: string;
    quantity: number;
    revenueCents: number;
    currency: string;
    productViews: number;
  }>;
  devices: AnalyticsMetric[];
  browsers: AnalyticsMetric[];
  operatingSystems: AnalyticsMetric[];
  countries: AnalyticsMetric[];
  cities: AnalyticsMetric[];
};
