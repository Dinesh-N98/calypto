import { NextResponse } from "next/server";
import { requireAdminRequest } from "@/lib/admin";
import {
  getUmamiAnalytics,
  UmamiAnalyticsError,
  type AnalyticsRange,
  type AnalyticsUnit,
} from "@/lib/umami-analytics";

export const dynamic = "force-dynamic";

const rangeDurations: Record<AnalyticsRange, number> = {
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
};

function isAnalyticsRange(value: string): value is AnalyticsRange {
  return value === "24h" || value === "7d" || value === "30d";
}

export async function GET(request: Request) {
  const authorization = await requireAdminRequest();
  if (!authorization.ok) return authorization.response;

  const requestedRange = new URL(request.url).searchParams.get("range");
  const range = requestedRange ?? "7d";
  if (!isAnalyticsRange(range)) {
    return NextResponse.json(
      { error: "Range must be one of 24h, 7d, or 30d." },
      { status: 400 },
    );
  }

  const endAt = Date.now();
  const startAt = endAt - rangeDurations[range];
  const unit: AnalyticsUnit = range === "24h" ? "hour" : "day";

  try {
    const analytics = await getUmamiAnalytics(range, startAt, endAt, unit);
    return NextResponse.json(analytics, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    if (error instanceof UmamiAnalyticsError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Unable to fetch Umami analytics.", error);
    return NextResponse.json(
      { error: "Unable to load analytics right now." },
      { status: 500 },
    );
  }
}
