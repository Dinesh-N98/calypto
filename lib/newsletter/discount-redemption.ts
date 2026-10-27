export const NEWSLETTER_DISCOUNT_CODE_PATTERN = /^CREW-[0-9A-HJKMNP-TV-Z]{8}$/u;

export const NEWSLETTER_DISCOUNT_ELIGIBLE_STATUSES = [
  "CONFIRMED",
  "UNSUBSCRIBED",
] as const;

export type NewsletterDiscountLookupStatus =
  | "VALID"
  | "ALREADY_REDEEMED"
  | "NOT_FOUND"
  | "INELIGIBLE";

type DiscountSubscriptionSnapshot = {
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
): NewsletterDiscountLookupStatus {
  if (!subscription) return "NOT_FOUND";
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
