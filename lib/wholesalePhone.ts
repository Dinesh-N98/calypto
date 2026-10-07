export type ParsedPhone = { valid: true; phone: string | null } | { valid: false };

export function parseWholesalePhone(value: unknown): ParsedPhone {
  if (value === undefined || value === null) return { valid: true, phone: null };
  if (typeof value !== "string") return { valid: false };

  const phone = value.trim().replace(/\s+/gu, " ");
  if (!phone) return { valid: true, phone: null };
  if (phone.length > 50 || !/^\+?[0-9\s().-]+$/u.test(phone)) {
    return { valid: false };
  }

  const digitCount = phone.replace(/[^0-9]/gu, "").length;
  if (digitCount < 7 || digitCount > 15) return { valid: false };

  return { valid: true, phone };
}
