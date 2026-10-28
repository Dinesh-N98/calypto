import { getDhlTracking } from "@/lib/dhl/tracking";
import { applyRateLimit, rateLimitResponse, withRateLimitHeaders } from "@/lib/request-security";
import { NextResponse } from "next/server";

type RouteContext = { params: Promise<{ awb: string }> };

export async function GET(request: Request, { params }: RouteContext) {
  const limit = await applyRateLimit(request, "dhl-tracking", 30, 10 * 60);
  if (!limit.allowed) return rateLimitResponse(limit);
  const respond = (response: Response) => withRateLimitHeaders(response, limit);
  const { awb } = await params;
  if (!/^[A-Za-z0-9-]{4,30}$/u.test(awb)) {
    return respond(NextResponse.json({ error: "AWB number is invalid." }, { status: 400 }));
  }
  try {
    const result = await getDhlTracking(awb);
    return respond(NextResponse.json({
      awb: result.awb,
      status: result.status,
      estimatedDeliveryDate: result.estimatedDeliveryDate,
      events: result.events,
    }, { headers: { "Cache-Control": "private, max-age=60" } }));
  } catch (error) {
    console.error("Unable to load DHL tracking.", error);
    return respond(NextResponse.json({ error: "DHL tracking is temporarily unavailable." }, { status: 502 }));
  }
}
