import { NextResponse } from "next/server";
import { requireAdminRequest } from "@/lib/admin";
import { getAdminAnalytics } from "@/lib/ga-analytics";
import type { AnalyticsRange } from "@/lib/analytics-types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function getAnalyticsFailure(error: unknown): { code: string; message: string } {
  const details = error instanceof Error ? error.message : String(error);
  const normalized = details.toLowerCase();

  if (
    normalized.includes("decoder routines::unsupported") ||
    normalized.includes("error:1e08010c")
  ) {
    return {
      code: "GA_PRIVATE_KEY_INVALID",
      message:
        "Google could not decode GA_PRIVATE_KEY. Verify that it is the complete PEM private key, update the environment variable, and redeploy.",
    };
  }
  if (normalized.includes("invalid_grant") || normalized.includes("invalid jwt signature")) {
    return {
      code: "GA_SERVICE_ACCOUNT_AUTH_FAILED",
      message:
        "Google rejected the service-account credentials. Verify GA_CLIENT_EMAIL matches GA_PRIVATE_KEY, then rotate or replace the key and redeploy.",
    };
  }
  if (normalized.includes("permission_denied")) {
    return {
      code: "GA_PROPERTY_ACCESS_DENIED",
      message:
        "The service account cannot read this GA4 property. Add its email as a Viewer in Property access management and confirm the Google Analytics Data API is enabled.",
    };
  }
  if (normalized.includes("ga4 data api is not configured")) {
    return {
      code: "GA_CONFIGURATION_MISSING",
      message:
        "GA4 server credentials are missing. Set GA_PROPERTY_ID, GA_CLIENT_EMAIL, and GA_PRIVATE_KEY, then redeploy.",
    };
  }
  if (normalized.includes("ga_private_key must be")) {
    return {
      code: "GA_PRIVATE_KEY_INVALID",
      message:
        "GA_PRIVATE_KEY must be a complete PEM private key. Check its BEGIN/END markers, update the environment variable, and redeploy.",
    };
  }
  if (normalized.includes("ga_property_id must be")) {
    return {
      code: "GA_PROPERTY_ID_INVALID",
      message: "GA_PROPERTY_ID must be the numeric ID of the GA4 property, then redeploy.",
    };
  }

  return {
    code: "ANALYTICS_UNAVAILABLE",
    message:
      "Analytics is temporarily unavailable. Verify GA4 service account access and configuration, then try again.",
  };
}

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
    const failure = getAnalyticsFailure(error);
    console.error("Unable to fetch admin analytics:", failure.code);
    return NextResponse.json(
      {
        error: failure.message,
        code: failure.code,
      },
      { status: 503, headers: { "Cache-Control": "private, no-store" } },
    );
  }
}
