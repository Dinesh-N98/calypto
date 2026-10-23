import { NextResponse } from "next/server";
import { requireAdminRequest } from "@/lib/admin";
import { getAdminAnalytics } from "@/lib/ga-analytics";
import type { AnalyticsRange } from "@/lib/analytics-types";

export const dynamic = "force-dynamic";

function isAnalyticsRange(value: string | null): value is AnalyticsRange {
  return value === "24h" || value === "7d" || value === "30d";
}

export async function GET(request: Request) {
  const authorization = await requireAdminRequest();
  if (!authorization.ok) return authorization.response;

  const requestedRange = new URL(request.url).searchParams.get("range");
  const range = requestedRange ?? "7d";
  if (!isAnalyticsRange(range)) {
    return NextResponse.json({ error: "Range must be one of 24h, 7d, or 30d." }, { status: 400 });
  }

  try {
    const analytics = await getAdminAnalytics(range);
    return NextResponse.json(analytics, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    const details = error instanceof Error ? error.message : String(error);
    console.error("Unable to fetch admin analytics:", details, error);
    return NextResponse.json(
      {
        error:
          "Analytics is temporarily unavailable. Verify GA4 service account access and configuration, then try again.",
        code: "ANALYTICS_UNAVAILABLE",
      },
      { status: 503, headers: { "Cache-Control": "private, no-store" } },
    );
  }
}
