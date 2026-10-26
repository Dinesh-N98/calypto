import "server-only";

type GaEnvironment = {
  GA_PROPERTY_ID?: string;
  GA_CLIENT_EMAIL?: string;
  GA_PRIVATE_KEY?: string;
};

export type GaCredentials = {
  clientEmail: string;
  privateKey: string;
  property: string;
};

function stripSurroundingQuotes(value: string): string {
  const first = value[0];
  const last = value[value.length - 1];
  return (first === '"' && last === '"') || (first === "'" && last === "'")
    ? value.slice(1, -1).trim()
    : value;
}

function normalizePrivateKey(value: string): string {
  return stripSurroundingQuotes(value.trim())
    .replace(/\\n/g, "\n")
    .replace(/\r\n?/g, "\n")
    .trim();
}

export function getGaCredentials(
  env: GaEnvironment = {
    GA_PROPERTY_ID: process.env.GA_PROPERTY_ID,
    GA_CLIENT_EMAIL: process.env.GA_CLIENT_EMAIL,
    GA_PRIVATE_KEY: process.env.GA_PRIVATE_KEY,
  },
): GaCredentials {
  const propertyId = env.GA_PROPERTY_ID?.trim();
  const clientEmail = env.GA_CLIENT_EMAIL?.trim();
  const rawPrivateKey = env.GA_PRIVATE_KEY;
  const missing = [
    !propertyId && "GA_PROPERTY_ID",
    !clientEmail && "GA_CLIENT_EMAIL",
    !rawPrivateKey?.trim() && "GA_PRIVATE_KEY",
  ].filter((name): name is string => Boolean(name));

  if (missing.length || !propertyId || !clientEmail || !rawPrivateKey?.trim()) {
    throw new Error(`GA4 Data API is not configured. Missing: ${missing.join(", ")}.`);
  }
  if (!/^\d+$/.test(propertyId)) {
    throw new Error("GA_PROPERTY_ID must be a numeric GA4 property ID.");
  }

  const privateKey = normalizePrivateKey(rawPrivateKey);
  if (
    !privateKey.startsWith("-----BEGIN PRIVATE KEY-----") ||
    !privateKey.endsWith("-----END PRIVATE KEY-----")
  ) {
    throw new Error(
      "GA_PRIVATE_KEY must be a PEM-encoded private key with BEGIN PRIVATE KEY and END PRIVATE KEY markers.",
    );
  }

  return {
    clientEmail,
    privateKey,
    property: `properties/${propertyId}`,
  };
}
