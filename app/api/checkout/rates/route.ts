import { buildDhlPackage, getDHLRates, type DhlPackage } from "@/lib/dhl/rate";
import { getDhlConfig } from "@/lib/config/dhl";
import { prisma } from "@/lib/prisma";
import {
  applyRateLimit,
  rateLimitResponse,
  readJsonBody,
  RequestBodyError,
  withRateLimitHeaders,
} from "@/lib/request-security";
import { NextResponse } from "next/server";
import { isDhlCountryCode, normalizeCountryCode } from "@/lib/checkout/international";

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

async function packagesForItems(value: unknown): Promise<DhlPackage[] | null> {
  if (!Array.isArray(value) || value.length < 1 || value.length > 100) return null;
  const quantities = new Map<string, number>();
  for (const item of value) {
    const quantity = isObject(item) ? item.quantity : undefined;
    if (
      !isObject(item) ||
      typeof item.variantId !== "string" ||
      typeof quantity !== "number" ||
      !Number.isSafeInteger(quantity) ||
      quantity < 1
    ) return null;
    quantities.set(item.variantId, (quantities.get(item.variantId) ?? 0) + quantity);
  }
  const ids = [...quantities.keys()].filter((id) => !id.startsWith("legacy:"));
  const variants = await prisma.productVariant.findMany({
    where: { id: { in: ids } },
    select: { id: true, weightKg: true, lengthCm: true, widthCm: true, heightCm: true },
  });
  const config = getDhlConfig();
  if (variants.length !== quantities.size) return null;
  return [buildDhlPackage(
    variants.map((variant) => ({
      ...variant,
      quantity: quantities.get(variant.id) ?? 0,
    })),
    config.defaultPackage,
  )];
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
  const streetLines = Array.isArray(recipient.streetLines)
    ? recipient.streetLines.filter((line): line is string => typeof line === "string").map((line) => line.trim())
    : typeof recipient.streetLines === "string" ? [recipient.streetLines.trim()] : [];
  const city = typeof recipient.city === "string" ? recipient.city.trim() : "";
  const postalCode = typeof recipient.postalCode === "string" ? recipient.postalCode.trim() : "";
  const countryCode = typeof recipient.countryCode === "string" ? recipient.countryCode.trim() : "";
  if (
    streetLines.length < 1 ||
    streetLines.length > 3 ||
    streetLines.some((line) => !line || line.length > 70) ||
    typeof recipient.city !== "string" || !recipient.city.trim() || recipient.city.trim().length > 100 ||
    typeof recipient.postalCode !== "string" || !recipient.postalCode.trim() || recipient.postalCode.trim().length > 30 ||
    typeof recipient.countryCode !== "string" || !isDhlCountryCode(recipient.countryCode) ||
    (recipient.stateOrProvinceCode !== undefined &&
      typeof recipient.stateOrProvinceCode !== "string")
  ) {
    return respond(NextResponse.json({ error: "The recipient address is invalid." }, { status: 400 }));
  }
  let packages: DhlPackage[] | null;
  try {
    packages = body.packages !== undefined
      ? parsePackages(body.packages)
      : await packagesForItems(body.items);
  } catch (error) {
    console.error("Unable to prepare DHL checkout packages.", error);
    return respond(NextResponse.json(
      { error: "DHL shipping configuration is temporarily unavailable." },
      { status: 503 },
    ));
  }
  if (!packages) {
    return respond(NextResponse.json({ error: "At least one valid package is required." }, { status: 400 }));
  }

  try {
    const rates = await getDHLRates({
      recipient: {
        streetLines,
        city,
        postalCode,
        countryCode: normalizeCountryCode(countryCode),
        stateOrProvinceCode: recipient.stateOrProvinceCode?.trim(),
      },
      packages,
    });
    return respond(NextResponse.json({ rates }, { headers: { "Cache-Control": "private, no-store" } }));
  } catch (error) {
    console.error("Unable to calculate DHL checkout rates.", error);
    const message = error instanceof Error ? error.message : "Unknown DHL integration error.";
    const status =
      error && typeof error === "object" && "details" in error &&
      error.details && typeof error.details === "object" &&
      "kind" in error.details && error.details.kind === "configuration"
        ? 503
        : 502;
    return respond(NextResponse.json(
      { error: `DHL rates are temporarily unavailable: ${message}` },
      { status },
    ));
  }
}
