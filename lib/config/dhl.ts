import "server-only";

export type DhlConfig = {
  username: string;
  password: string;
  accountNumber: string;
  baseUrl: string;
  shipper: {
    streetLines: string;
    city: string;
    postalCode: string;
    countryCode: string;
    phoneNumber: string;
    emailAddress: string;
  };
  defaultPackage: {
    weightKg: number;
    lengthCm: number;
    widthCm: number;
    heightCm: number;
  };
  endpoints: {
    rate: string;
    shipment: string;
    pickup: string;
    tracking: string;
  };
};

type Environment = Record<string, string | undefined>;

function required(environment: Environment, name: string): string {
  const value = environment[name]?.trim();
  if (!value) throw new Error(`${name} is required for DHL integration.`);
  return value;
}

function positiveNumber(environment: Environment, name: string, fallback: number): number {
  const raw = environment[name];
  const value = raw === undefined || raw.trim() === "" ? fallback : Number(raw);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${name} must be a positive number.`);
  }
  return value;
}

function normalizeBaseUrl(value: string): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("DHL_BASE_URL must be a valid HTTPS URL.");
  }
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) {
    throw new Error("DHL_BASE_URL must be a valid HTTPS URL without credentials or query parameters.");
  }
  return url.toString().replace(/\/$/, "");
}

export function getDhlConfig(environment: Environment = process.env): DhlConfig {
  const baseUrl = normalizeBaseUrl(
    environment.DHL_BASE_URL ?? "https://wsbexpress.dhl.com:443/sndpt/",
  );
  const username = required(environment, "DHL_USERNAME");
  const password = required(environment, "DHL_PASSWORD");
  const accountNumber = required(environment, "DHL_ACCOUNT_NUMBER");
  return {
    username,
    password,
    accountNumber,
    baseUrl,
    shipper: {
      streetLines: "58/3, Makandana road",
      city: "Kesbewa",
      postalCode: "10300",
      countryCode: "LK",
      phoneNumber: "+94766434416",
      emailAddress: "icalypto@gmail.com",
    },
    defaultPackage: {
      weightKg: positiveNumber(environment, "DHL_DEFAULT_PACKAGE_WEIGHT_KG", 0.5),
      lengthCm: positiveNumber(environment, "DHL_DEFAULT_PACKAGE_LENGTH_CM", 3),
      widthCm: positiveNumber(environment, "DHL_DEFAULT_PACKAGE_WIDTH_CM", 2),
      heightCm: positiveNumber(environment, "DHL_DEFAULT_PACKAGE_HEIGHT_CM", 1),
    },
    endpoints: {
      rate: `${baseUrl}/expressRateBook`,
      shipment: `${baseUrl}/expressRateBook`,
      pickup: `${baseUrl}/requestPickup`,
      tracking: `${baseUrl}/glDHLExpressTrack`,
    },
  };
}

export function assertDhlConfigured(): void {
  getDhlConfig();
}
