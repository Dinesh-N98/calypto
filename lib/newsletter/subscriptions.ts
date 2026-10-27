import type { NewsletterSubscriptionStatus } from "@prisma/client";

const EMAIL_PATTERN =
  /^[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@(?:[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?\.)+[A-Z]{2,63}$/i;

export const NEWSLETTER_CONSENT_VERSION = "2026-10-27-v1";
export const NEWSLETTER_CONSENT_TEXT =
  "I agree to receive Calypto emails about exclusive offers, new designs, and fishing tips. I can unsubscribe anytime.";
export const RESEND_COOLDOWN_MS = 10 * 60 * 1000;

export function normalizeNewsletterEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmedEmail = value.trim();
  if (!/^[\x00-\x7F]*$/u.test(trimmedEmail)) return null;
  const email = trimmedEmail.toLowerCase();
  const [localPart, domain] = email.split("@");
  if (
    email.length > 254 ||
    !localPart ||
    localPart.length > 64 ||
    !domain ||
    domain.length > 253 ||
    localPart.startsWith(".") ||
    localPart.endsWith(".") ||
    localPart.includes("..") ||
    !EMAIL_PATTERN.test(email)
  ) {
    return null;
  }
  return email;
}

export type NewsletterSubscriptionAction = "CREATE" | "RESEND" | "NOOP" | "RESUBSCRIBE";

export function getNewsletterSubscriptionAction(
  status: NewsletterSubscriptionStatus | null,
  confirmationSentAt: Date | null,
  now: Date = new Date(),
): NewsletterSubscriptionAction {
  if (status === null) return "CREATE";
  if (status === "UNSUBSCRIBED") return "RESUBSCRIBE";
  if (status === "CONFIRMED") return "NOOP";
  if (
    !confirmationSentAt ||
    confirmationSentAt.getTime() > now.getTime() ||
    now.getTime() - confirmationSentAt.getTime() >= RESEND_COOLDOWN_MS
  ) {
    return "RESEND";
  }
  return "NOOP";
}
