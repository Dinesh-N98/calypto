import { randomBytes } from "node:crypto";

const CROCKFORD_BASE32 = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

export function generateNewsletterDiscountCode(): string {
  const suffix = Array.from(randomBytes(8), (byte) => CROCKFORD_BASE32[byte & 31]).join("");
  return `CREW-${suffix}`;
}
