import { afterEach, describe, expect, it, vi } from "vitest";
import {
  renderContactInquiryNotification,
  sendContactInquiryNotification,
  type ContactInquiryNotification,
} from "@/lib/contact-notification";

const originalEnvironment = {
  APP_BASE_URL: process.env.APP_BASE_URL,
  EMAIL_FROM: process.env.EMAIL_FROM,
  OWNER_NOTIFICATION_EMAIL: process.env.OWNER_NOTIFICATION_EMAIL,
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  NODE_ENV: process.env.NODE_ENV,
};

const sample: ContactInquiryNotification = {
  leadId: "lead-123",
  name: "Angler",
  email: "customer@example.com",
  message: "I would like to order.",
  createdAt: new Date("2026-10-27T10:00:00.000Z"),
  discountCode: "CREW-01ABCDEF",
  discountCodeStatus: "VALID",
  discountSubscriberEmail: "subscriber@example.com",
  discountPercent: 15,
};

afterEach(() => {
  vi.unstubAllGlobals();
  for (const [key, value] of Object.entries(originalEnvironment)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

describe("contact inquiry notification", () => {
  it("sends the owner complete inquiry and discount details via Resend", async () => {
    process.env.APP_BASE_URL = "https://calyptobait.com";
    process.env.EMAIL_FROM = "Calypto <orders@calyptobait.com>";
    process.env.OWNER_NOTIFICATION_EMAIL = "owner@example.com";
    process.env.RESEND_API_KEY = "test-api-key";
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    await expect(sendContactInquiryNotification(sample)).resolves.toBe("sent");
    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    const payload = JSON.parse(String(options.body));
    expect(url).toBe("https://api.resend.com/emails");
    expect(payload).toMatchObject({
      from: "Calypto <orders@calyptobait.com>",
      to: ["owner@example.com"],
      reply_to: "customer@example.com",
      subject: "New Calypto inquiry from Angler",
    });
    expect(payload.text).toContain(
      "Product subtotal only, not shipping/tax; first order only; verify before redeeming.",
    );
    expect(payload.text).toContain("subscriber@example.com");
    expect(payload.text).toContain("Rate: 15%");
    expect(payload.html).toContain(
      "https://calyptobait.com/admin/crm/leads?leadId=lead-123",
    );
    expect(options.headers).toMatchObject({ Authorization: "Bearer test-api-key" });
    expect(options.cache).toBe("no-store");
  });

  it("escapes markup and prevents CR/LF injection in the subject and markup", () => {
    process.env.APP_BASE_URL = "https://calyptobait.com";
    const rendered = renderContactInquiryNotification({
      ...sample,
      name: "Shopper\r\nBcc: attacker@example.com<script>",
      message: '<img src=x onerror="alert(1)">\r\nHello',
      email: "customer@example.com",
      discountSubscriberEmail: "subscriber@example.com",
    });
    expect(rendered.subject).not.toMatch(/[\r\n]/u);
    expect(rendered.subject).toContain("Bcc: attacker@example.com");
    expect(rendered.html).toContain("&lt;script&gt;");
    expect(rendered.html).toContain("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
    expect(rendered.html).not.toContain("Inquiry email differs");
    expect(rendered.html).not.toContain("Warning:");
    expect(rendered.html).not.toContain("<img src=x");
    expect(rendered.html).not.toContain("<script>");
  });

  it("throws without exposing provider response details when Resend rejects delivery", async () => {
    process.env.APP_BASE_URL = "https://calyptobait.com";
    process.env.EMAIL_FROM = "Calypto <orders@calyptobait.com>";
    process.env.OWNER_NOTIFICATION_EMAIL = "owner@example.com";
    process.env.RESEND_API_KEY = "test-api-key";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 503, text: async () => "private details" }),
    );

    await expect(sendContactInquiryNotification(sample)).rejects.toThrow(
      "Resend contact notification returned HTTP 503.",
    );
  });

  it("skips Resend when OWNER_NOTIFICATION_EMAIL is unset", async () => {
    delete process.env.OWNER_NOTIFICATION_EMAIL;
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(sendContactInquiryNotification(sample)).resolves.toBe("skipped");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects CR/LF in configured headers before sending", async () => {
    process.env.EMAIL_FROM = "orders@calyptobait.com\r\nBcc: attacker@example.com";
    process.env.OWNER_NOTIFICATION_EMAIL = "owner@example.com";
    process.env.RESEND_API_KEY = "test-api-key";
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(sendContactInquiryNotification(sample)).rejects.toThrow(
      "Contact notification email configuration is invalid.",
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
