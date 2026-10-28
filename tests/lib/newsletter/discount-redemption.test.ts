import { describe, expect, it } from "vitest";
import {
  getNewsletterDiscountLookupStatus,
  normalizeNewsletterDiscountCode,
} from "@/lib/newsletter/discount-redemption";

describe("newsletter discount redemption rules", () => {
  it("trims and uppercases valid Crockford codes", () => {
    expect(normalizeNewsletterDiscountCode(" crew-01abCDef ")).toBe("CREW-01ABCDEF");
  });

  it.each(["CREW-ABCDEFGI", "CREW-ABCDEFGO", "CREW-ABCDEFGU", "CREW-123", "code"])(
    "rejects invalid discount code %s",
    (code) => {
      expect(normalizeNewsletterDiscountCode(code)).toBeNull();
    },
  );

  it("classifies only unredeemed confirmed or unsubscribed subscribers as valid", () => {
    expect(
      getNewsletterDiscountLookupStatus({ status: "CONFIRMED", discountRedeemedAt: null }),
    ).toBe("VALID");
    expect(
      getNewsletterDiscountLookupStatus({ status: "UNSUBSCRIBED", discountRedeemedAt: null }),
    ).toBe("VALID");
    expect(
      getNewsletterDiscountLookupStatus({ status: "PENDING_CONFIRMATION", discountRedeemedAt: null }),
    ).toBe("INELIGIBLE");
    expect(
      getNewsletterDiscountLookupStatus({
        status: "CONFIRMED",
        discountRedeemedAt: new Date(),
      }),
    ).toBe("ALREADY_REDEEMED");
    expect(getNewsletterDiscountLookupStatus(null)).toBe("NOT_FOUND");
  });

  it("rejects a code when the usage email differs from the subscriber email", () => {
    expect(
      getNewsletterDiscountLookupStatus(
        {
          email: "usera@example.com",
          status: "CONFIRMED",
          discountRedeemedAt: null,
        },
        "userb@example.com",
      ),
    ).toBe("EMAIL_MISMATCH");
    expect(
      getNewsletterDiscountLookupStatus(
        {
          email: "UserA@Example.com",
          status: "CONFIRMED",
          discountRedeemedAt: null,
        },
        "usera@example.com",
      ),
    ).toBe("VALID");
  });
});
