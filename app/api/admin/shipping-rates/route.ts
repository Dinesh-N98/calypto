import { NextResponse } from "next/server";
import { requireAdminRequest } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { getSriLankaShippingRateSettings } from "@/lib/checkout/sri-lanka-shipping";
import { readJsonBody, RequestBodyError } from "@/lib/request-security";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const SETTINGS_ID = "LK";
const RATE_KEYS = ["underOneKgCents", "oneToThreeKgCents", "overThreeKgCents"] as const;

function noStoreJson(body: Record<string, unknown>, status: number): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isValidRates(value: unknown): value is Record<(typeof RATE_KEYS)[number], number> {
  if (!isRecord(value) || Object.keys(value).length !== RATE_KEYS.length) return false;
  return RATE_KEYS.every(
    (key) =>
      Number.isSafeInteger(value[key]) &&
      typeof value[key] === "number" &&
      value[key] > 0 &&
      value[key] <= 1_000_000,
  );
}

export async function GET() {
  const authorization = await requireAdminRequest();
  if (!authorization.ok) return authorization.response;

  try {
    return noStoreJson({ rates: await getSriLankaShippingRateSettings() }, 200);
  } catch (error) {
    console.error("Unable to load Sri Lanka shipping rates.", error);
    return noStoreJson({ error: "Unable to load Sri Lanka shipping rates." }, 500);
  }
}

export async function PUT(request: Request) {
  const authorization = await requireAdminRequest();
  if (!authorization.ok) return authorization.response;

  let body: unknown;
  try {
    body = await readJsonBody(request, 4_096);
  } catch (error) {
    if (error instanceof RequestBodyError) {
      return noStoreJson({ error: error.message }, error.status);
    }
    return noStoreJson({ error: "Request body must be valid JSON." }, 400);
  }
  if (!isValidRates(body)) {
    return noStoreJson(
      { error: "Enter a positive USD rate for each weight tier, up to $10,000." },
      400,
    );
  }

  try {
    const rates = await prisma.sriLankaShippingRateSettings.upsert({
      where: { id: SETTINGS_ID },
      create: { id: SETTINGS_ID, ...body },
      update: body,
      select: {
        underOneKgCents: true,
        oneToThreeKgCents: true,
        overThreeKgCents: true,
      },
    });
    return noStoreJson({ rates }, 200);
  } catch (error) {
    console.error("Unable to save Sri Lanka shipping rates.", error);
    return noStoreJson({ error: "Unable to save Sri Lanka shipping rates." }, 500);
  }
}
