export const DHL_COUNTRIES = [
  ["LK", "Sri Lanka"],
  ["US", "United States"],
  ["CA", "Canada"],
  ["SG", "Singapore"],
  ["TH", "Thailand"],
  ["JP", "Japan"],
  ["AU", "Australia"],
  ["NZ", "New Zealand"],
  ["GB", "United Kingdom"],
  ["DE", "Germany"],
  ["FR", "France"],
  ["IN", "India"],
  ["MY", "Malaysia"],
  ["AE", "United Arab Emirates"],
  ["NL", "Netherlands"],
  ["IT", "Italy"],
  ["ES", "Spain"],
  ["SE", "Sweden"],
  ["CH", "Switzerland"],
  ["ZA", "South Africa"],
] as const;

export const DHL_COUNTRY_CODES = new Set(DHL_COUNTRIES.map(([code]) => code));

export const PHONE_COUNTRY_CODES = [
  ["+94", "Sri Lanka"],
  ["+1", "United States / Canada"],
  ["+65", "Singapore"],
  ["+66", "Thailand"],
  ["+81", "Japan"],
  ["+61", "Australia"],
  ["+64", "New Zealand"],
  ["+44", "United Kingdom"],
  ["+49", "Germany"],
  ["+33", "France"],
  ["+91", "India"],
  ["+60", "Malaysia"],
  ["+971", "United Arab Emirates"],
] as const;

export function normalizeCountryCode(value: string): string {
  const normalized = value.trim().toUpperCase();
  const legacy = DHL_COUNTRIES.find(([, name]) => name.toUpperCase() === normalized);
  return legacy?.[0] ?? normalized;
}

export function isDhlCountryCode(value: string): boolean {
  return DHL_COUNTRIES.some(([code]) => code === normalizeCountryCode(value));
}
