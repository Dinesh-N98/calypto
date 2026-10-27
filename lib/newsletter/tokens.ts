import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export const CONFIRMATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

export function createNewsletterToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashNewsletterToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function newsletterTokensMatch(firstHash: string, secondHash: string): boolean {
  if (!/^[a-f0-9]{64}$/iu.test(firstHash) || !/^[a-f0-9]{64}$/iu.test(secondHash)) {
    return false;
  }
  return timingSafeEqual(Buffer.from(firstHash, "hex"), Buffer.from(secondHash, "hex"));
}

export function isConfirmationTokenExpired(sentAt: Date | null, now: Date = new Date()): boolean {
  if (!sentAt || sentAt.getTime() > now.getTime()) return true;
  return now.getTime() - sentAt.getTime() >= CONFIRMATION_TOKEN_TTL_MS;
}
