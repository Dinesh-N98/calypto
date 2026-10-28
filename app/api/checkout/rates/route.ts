import { getDHLRates, type DhlPackage } from "@/lib/dhl/rate";
import {
  applyRateLimit,
  rateLimitResponse,
  readJsonBody,
  RequestBodyError,
  withRateLimitHeaders,
} from "@/lib/request-security";
import { NextResponse } from "next/server";

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parsePackages(value: unknown): DhlPackage[] | null {
  if (!Array.isArray(value) || value.length < 1 || value.length > 50) return null;
  const packages = value.map((item) => {
    if (!isObject(item)) return null;
    const values = ["weightKg", "lengthCm", "widthCm", "heightCm"].map((key) => item[key]);
    return values.every((entry) => typeof entry === "number" && Number.isFinite(entry) && entry > 0)
      ? {
          weightKg: values[0] as number,
          lengthCm: values[1] as number,
          widthCm: values[2] as number,
          heightCm: values[3] as number,
        }
      : null;
  });
  return packages.every((item): item is DhlPackage => item !== null) ? packages : null;
}

export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return NextResponse.json({ error: "Cross-origin checkout is not allowed." }, { status: 403 });
  }
  const limit = await applyRateLimit(request, "dhl-rate-quote", 20, 10 * 60);
  if (!limit.allowed) return rateLimitResponse(limit);
  const respond = (response: Response) => withRateLimitHeaders(response, limit);

  let body: unknown;
  try {
    body = await readJsonBody(request, 16 * 1024);
  } catch (error) {
    if (error instanceof RequestBodyError) {
      return respond(NextResponse.json({ error: error.message }, { status: error.status }));
    }
    throw error;
  }
  if (!isObject(body) || !isObject(body.recipient)) {
    return respond(NextResponse.json({ error: "A recipient address is required." }, { status: 400 }));
  }
  const recipient = body.recipient;
  const stringFields = ["streetLines", "city", "postalCode", "countryCode"];
  const streetLines = typeof recipient.streetLines === "string" ? recipient.streetLines.trim() : "";
  const city = typeof recipient.city === "string" ? recipient.city.trim() : "";
  const postalCode = typeof recipient.postalCode === "string" ? recipient.postalCode.trim() : "";
  const countryCode = typeof recipient.countryCode === "string" ? recipient.countryCode.trim() : "";
  if (
    stringFields.some((field) => typeof recipient[field] !== "string" || !recipient[field].trim()) ||
    (recipient.stateOrProvinceCode !== undefined &&
      typeof recipient.stateOrProvinceCode !== "string")
  ) {
    return respond(NextResponse.json({ error: "The recipient address is invalid." }, { status: 400 }));
  }
  const packages = parsePackages(body.packages);
  if (!packages) {
    return respond(NextResponse.json({ error: "At least one valid package is required." }, { status: 400 }));
  }

  try {
    const rates = await getDHLRates({
      recipient: {
        streetLines,
        city,
        postalCode,
        countryCode: countryCode.toUpperCase(),
        stateOrProvinceCode: recipient.stateOrProvinceCode?.trim(),
      },
      packages,
    });
    return respond(NextResponse.json({ rates }, { headers: { "Cache-Control": "private, no-store" } }));
  } catch (error) {
    console.error("Unable to calculate DHL checkout rates.", error);
    return respond(NextResponse.json({ error: "DHL rates are temporarily unavailable." }, { status: 502 }));
  }
}
