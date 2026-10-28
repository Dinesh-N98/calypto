export const NEWSLETTER_DISCOUNT_CODE_PATTERN = /^CREW-[0-9A-HJKMNP-TV-Z]{8}$/u;

export const NEWSLETTER_DISCOUNT_ELIGIBLE_STATUSES = [
  "CONFIRMED",
  "UNSUBSCRIBED",
] as const;

export type NewsletterDiscountLookupStatus =
  | "VALID"
  | "ALREADY_REDEEMED"
  | "NOT_FOUND"
  | "INELIGIBLE"
  | "EMAIL_MISMATCH";

type DiscountSubscriptionSnapshot = {
  email?: string | null;
  status: string;
  discountRedeemedAt: Date | null;
};

export function normalizeNewsletterDiscountCode(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toUpperCase();
  return NEWSLETTER_DISCOUNT_CODE_PATTERN.test(normalized) ? normalized : null;
}

export function getNewsletterDiscountLookupStatus(
  subscription: DiscountSubscriptionSnapshot | null,
  usageEmail?: string | null,
): NewsletterDiscountLookupStatus {
  if (!subscription) return "NOT_FOUND";
  if (
    usageEmail !== undefined &&
    usageEmail !== null &&
    (!subscription.email || subscription.email.toLowerCase() !== usageEmail.trim().toLowerCase())
  ) {
    return "EMAIL_MISMATCH";
  }
  if (subscription.discountRedeemedAt) return "ALREADY_REDEEMED";
  if (
    !NEWSLETTER_DISCOUNT_ELIGIBLE_STATUSES.some(
      (eligibleStatus) => eligibleStatus === subscription.status,
    )
  ) {
    return "INELIGIBLE";
  }
  return "VALID";
}
