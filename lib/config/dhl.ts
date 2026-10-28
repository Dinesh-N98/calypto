import "server-only";

export type DhlConfig = {
  username: string;
  password: string;
  accountNumber: string;
  baseUrl: string;
  shipperCountry: string;
  shipperCity: string;
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
  const shipperCountry = (environment.DHL_SHIPPER_COUNTRY ?? "LK").trim().toUpperCase();
  const shipperCity = (environment.DHL_SHIPPER_CITY ?? "Colombo 02").trim();

  if (!/^[A-Z]{2}$/.test(shipperCountry)) {
    throw new Error("DHL_SHIPPER_COUNTRY must be a two-letter ISO country code.");
  }
  if (!shipperCity) throw new Error("DHL_SHIPPER_CITY is required for DHL integration.");

  return {
    username,
    password,
    accountNumber,
    baseUrl,
    shipperCountry,
    shipperCity,
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
