import { describe, expect, it, vi } from "vitest";

const resendSend = vi.hoisted(() => vi.fn());
vi.mock("resend", () => ({
  Resend: class {
    emails = { send: resendSend };
  },
}));
import { generateNewsletterDiscountCode } from "@/lib/newsletter/discount-code";
import {
  getNewsletterSubscriptionAction,
  normalizeNewsletterEmail,
} from "@/lib/newsletter/subscriptions";
import {
  createNewsletterToken,
  hashNewsletterToken,
  isConfirmationTokenExpired,
  newsletterTokensMatch,
} from "@/lib/newsletter/tokens";
import {
  renderNewsletterConfirmationEmail,
  renderNewsletterWelcomeEmail,
  sendNewsletterWelcomeEmail,
} from "@/lib/newsletter/email";

describe("newsletter utilities", () => {
  it("normalizes valid email addresses and rejects malformed addresses", () => {
    expect(normalizeNewsletterEmail("  Angler+Crew@Example.COM ")).toBe("angler+crew@example.com");
    expect(normalizeNewsletterEmail("first..last@example.com")).toBeNull();
    expect(normalizeNewsletterEmail("user@localhost")).toBeNull();
    expect(normalizeNewsletterEmail("user@examKle.com")).toBeNull();
    expect(normalizeNewsletterEmail("x".repeat(250) + "@example.com")).toBeNull();
    expect(normalizeNewsletterEmail(null)).toBeNull();
  });

  it("generates typable unique discount codes from the Crockford alphabet", () => {
    const codes = Array.from({ length: 100 }, generateNewsletterDiscountCode);
    expect(codes.every((code) => /^CREW-[0-9A-HJKMNP-TV-Z]{8}$/u.test(code))).toBe(true);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("generates 32-byte tokens, hashes them, and compares hashes in constant time", () => {
    const token = createNewsletterToken();
    const hash = hashNewsletterToken(token);
    expect(Buffer.from(token, "base64url")).toHaveLength(32);
    expect(hash).toMatch(/^[a-f0-9]{64}$/u);
    expect(newsletterTokensMatch(hash, hash)).toBe(true);
    expect(newsletterTokensMatch(hash, hashNewsletterToken("different"))).toBe(false);
    expect(newsletterTokensMatch(hash, "invalid")).toBe(false);
  });

  it("expires confirmation tokens after 24 hours", () => {
    const sentAt = new Date("2026-10-27T00:00:00.000Z");
    expect(isConfirmationTokenExpired(sentAt, new Date("2026-10-27T23:59:59.999Z"))).toBe(false);
    expect(isConfirmationTokenExpired(sentAt, new Date("2026-10-28T00:00:00.000Z"))).toBe(true);
    expect(isConfirmationTokenExpired(sentAt, new Date("2026-10-28T00:00:00.001Z"))).toBe(true);
    expect(isConfirmationTokenExpired(null)).toBe(true);
  });

  it("chooses subscription actions for each persisted status", () => {
    const now = new Date("2026-10-27T12:00:00.000Z");
    expect(getNewsletterSubscriptionAction(null, null, now)).toBe("CREATE");
    expect(getNewsletterSubscriptionAction("UNSUBSCRIBED", null, now)).toBe("RESUBSCRIBE");
    expect(getNewsletterSubscriptionAction("CONFIRMED", null, now)).toBe("NOOP");
    expect(getNewsletterSubscriptionAction("PENDING_CONFIRMATION", now, now)).toBe("NOOP");
    expect(
      getNewsletterSubscriptionAction(
        "PENDING_CONFIRMATION",
        new Date(now.getTime() - 10 * 60 * 1000),
        now,
      ),
    ).toBe("RESEND");
  });

  it("keeps discount codes out of the initial confirmation email", () => {
    const content = renderNewsletterConfirmationEmail(
      "https://calyptobait.com/newsletter/confirm?token=example",
    );
    expect(content.html).toContain("Confirm my subscription");
    expect(content.html).not.toMatch(/CREW-[0-9A-HJKMNP-TV-Z]{8}/u);
    expect(content.text).toContain("Confirm here:");
    expect(content.text).not.toMatch(/CREW-[0-9A-HJKMNP-TV-Z]{8}/u);
  });

  it("includes clear discount terms and manual-inquiry instructions in welcome emails", () => {
    const content = renderNewsletterWelcomeEmail(
      "CREW-ABCD1234",
      "https://calyptobait.com/newsletter/unsubscribe?token=example",
    );
    expect(content.html).toContain(
      "15% off your first order. Applies to product subtotal only (excludes shipping and tax). Single-use only and tied to this email address.",
    );
    expect(content.html).toContain(
      "Online checkout is not yet available; include this code in your order inquiry and we will apply it manually.",
    );
    expect(content.text).toContain(
      "15% off your first order. Applies to product subtotal only (excludes shipping and tax). Single-use only and tied to this email address.",
    );
    expect(content.text).toContain(
      "Online checkout is not yet available; include this code in your order inquiry and we will apply it manually.",
    );
  });

  it("HTML-escapes dynamic welcome-email content", () => {
    const content = renderNewsletterWelcomeEmail(
      "<script>alert(1)</script>",
      "https://example.com/?x=1&y=2",
    );
    expect(content.html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(content.html).toContain("https://example.com/?x=1&amp;y=2");
    expect(content.text).toContain("https://example.com/?x=1&y=2");
  });

  it("reports Resend welcome-email provider errors with provider details", async () => {
    const previous = {
      EMAIL_FROM: process.env.EMAIL_FROM,
      EMAIL_REPLY_TO: process.env.EMAIL_REPLY_TO,
      RESEND_API_KEY: process.env.RESEND_API_KEY,
    };
    process.env.EMAIL_FROM = "Calypto <crew@calyptobait.com>";
    process.env.EMAIL_REPLY_TO = "icalypto@gmail.com";
    process.env.RESEND_API_KEY = "test-api-key";
    resendSend.mockResolvedValue({
      data: null,
      error: {
        name: "validation_error",
        message: "The from address is invalid",
        statusCode: 422,
        code: "validation_error",
      },
    });
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    try {
      await expect(sendNewsletterWelcomeEmail({
        email: "angler@example.com",
        discountCode: "CREW-ABCD1234",
        unsubscribeUrl: "https://calyptobait.com/newsletter/unsubscribe?token=example",
      })).rejects.toThrow(/422.*The from address is invalid/u);
      expect(JSON.stringify(consoleError.mock.calls)).toContain("422");
      expect(JSON.stringify(consoleError.mock.calls)).toContain("validation_error");
    } finally {
      consoleError.mockRestore();
      if (previous.EMAIL_FROM === undefined) delete process.env.EMAIL_FROM;
      else process.env.EMAIL_FROM = previous.EMAIL_FROM;
      if (previous.EMAIL_REPLY_TO === undefined) delete process.env.EMAIL_REPLY_TO;
      else process.env.EMAIL_REPLY_TO = previous.EMAIL_REPLY_TO;
      if (previous.RESEND_API_KEY === undefined) delete process.env.RESEND_API_KEY;
      else process.env.RESEND_API_KEY = previous.RESEND_API_KEY;
      vi.unstubAllGlobals();
    }
  });

  it("sends welcome email through Resend with the configured sender, reply-to, and unsubscribe header", async () => {
    const previous = {
      EMAIL_FROM: process.env.EMAIL_FROM,
      EMAIL_REPLY_TO: process.env.EMAIL_REPLY_TO,
      RESEND_API_KEY: process.env.RESEND_API_KEY,
    };
    process.env.EMAIL_FROM = "Calypto <crew@calyptobait.com>";
    process.env.EMAIL_REPLY_TO = "icalypto@gmail.com";
    process.env.RESEND_API_KEY = "test-api-key";
    resendSend.mockResolvedValue({ data: { id: "email_123" }, error: null });

    try {
      await sendNewsletterWelcomeEmail({
        email: "angler@example.com",
        discountCode: "CREW-ABCD1234",
        unsubscribeUrl: "https://calyptobait.com/newsletter/unsubscribe?token=example",
      });

      expect(resendSend).toHaveBeenCalledWith(expect.objectContaining({
        from: "Calypto <crew@calyptobait.com>",
        replyTo: "icalypto@gmail.com",
        html: expect.stringContaining("CREW-ABCD1234"),
        text: expect.stringContaining("CREW-ABCD1234"),
        headers: {
          "List-Unsubscribe": "<https://calyptobait.com/newsletter/unsubscribe?token=example>",
        },
      }));
    } finally {
      if (previous.EMAIL_FROM === undefined) delete process.env.EMAIL_FROM;
      else process.env.EMAIL_FROM = previous.EMAIL_FROM;
      if (previous.EMAIL_REPLY_TO === undefined) delete process.env.EMAIL_REPLY_TO;
      else process.env.EMAIL_REPLY_TO = previous.EMAIL_REPLY_TO;
      if (previous.RESEND_API_KEY === undefined) delete process.env.RESEND_API_KEY;
      else process.env.RESEND_API_KEY = previous.RESEND_API_KEY;
      vi.unstubAllGlobals();
    }
  });
});
