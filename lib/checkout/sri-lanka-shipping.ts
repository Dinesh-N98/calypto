import "server-only";
import { prisma } from "@/lib/prisma";
import { CHECKOUT_CURRENCY } from "@/lib/checkout/constants";
import { normalizeCountryCode } from "@/lib/checkout/international";
import { DhlApiError } from "@/lib/dhl/client";
import { getDHLRates, type DhlRate, type DhlRateRequest } from "@/lib/dhl/rate";

const SETTINGS_ID = "LK";
export const SRI_LANKA_LOCAL_SHIPPING_CODE = "LK-LOCAL-WEIGHT";

export type SriLankaShippingRateSettings = {
  underOneKgCents: number;
  oneToThreeKgCents: number;
  overThreeKgCents: number;
};

export async function getSriLankaShippingRateSettings(): Promise<SriLankaShippingRateSettings> {
  const settings = await prisma.sriLankaShippingRateSettings.findUnique({
    where: { id: SETTINGS_ID },
    select: {
      underOneKgCents: true,
      oneToThreeKgCents: true,
      overThreeKgCents: true,
    },
  });
  if (!settings) throw new Error("Sri Lanka shipping rates have not been initialized.");
  return settings;
}

export function getSriLankaLocalShippingRate(
  weightKg: number,
  settings: SriLankaShippingRateSettings,
): DhlRate {
  if (!Number.isFinite(weightKg) || weightKg <= 0) {
    throw new Error("Package weight must be greater than zero.");
  }
  const tier =
    weightKg < 1
      ? {
          serviceName: "Sri Lanka local delivery (under 1 kg)",
          amountCents: settings.underOneKgCents,
        }
      : weightKg <= 3
        ? {
            serviceName: "Sri Lanka local delivery (1-3 kg)",
            amountCents: settings.oneToThreeKgCents,
          }
        : {
            serviceName: "Sri Lanka local delivery (over 3 kg)",
            amountCents: settings.overThreeKgCents,
          };
  const { serviceName, amountCents } = tier;
  if (!Number.isSafeInteger(amountCents) || amountCents <= 0 || amountCents > 1_000_000) {
    throw new Error("Sri Lanka shipping rate must be a positive amount in cents.");
  }
  return {
    serviceCode: SRI_LANKA_LOCAL_SHIPPING_CODE,
    serviceName,
    currency: CHECKOUT_CURRENCY,
    amount: amountCents / 100,
  };
}

function isDhlNoUsableRatesError(error: unknown): error is DhlApiError {
  return error instanceof DhlApiError && error.details.kind === "api";
}

export async function getCheckoutShippingRates(request: DhlRateRequest): Promise<DhlRate[]> {
  const countryCode = normalizeCountryCode(request.recipient.countryCode);
  try {
    const rates = await getDHLRates(request);
    if (rates.length > 0 || countryCode !== "LK") return rates;
  } catch (error) {
    if (countryCode !== "LK" || !isDhlNoUsableRatesError(error)) throw error;
    console.warn("DHL returned no usable Sri Lanka rates; using configured local delivery rates.", {
      code: error.details.code,
    });
  }

  if (countryCode !== "LK") return [];
  const settings = await getSriLankaShippingRateSettings();
  const weightKg = request.packages.reduce((total, pkg) => total + pkg.weightKg, 0);
  return [getSriLankaLocalShippingRate(weightKg, settings)];
}
