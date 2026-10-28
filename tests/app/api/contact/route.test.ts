import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  create: vi.fn(),
  applyRateLimit: vi.fn(),
  rateLimitResponse: vi.fn(),
  sendNotification: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    newsletterSubscription: { findUnique: mocks.findUnique },
    lead: { create: mocks.create },
  },
}));
vi.mock("@/lib/request-security", () => ({
  applyRateLimit: mocks.applyRateLimit,
  rateLimitResponse: mocks.rateLimitResponse,
  readJsonBody: async (request: Request) => request.json(),
  RequestBodyError: class RequestBodyError extends Error {
    status = 400;
  },
}));
vi.mock("@/lib/contact-notification", () => ({
  sendContactInquiryNotification: mocks.sendNotification,
}));

import { POST } from "@/app/api/contact/route";

const allowed = { allowed: true, limit: 5, remaining: 4, resetAt: 0 };

function request(body: unknown) {
  return new Request("https://calyptobait.com/api/contact", {
    method: "POST",
    headers: { "content-type": "application/json", "x-real-ip": "203.0.113.15" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.applyRateLimit.mockResolvedValue(allowed);
  mocks.create.mockResolvedValue({ id: "lead-1", createdAt: new Date("2026-10-27T10:00:00.000Z") });
  mocks.findUnique.mockResolvedValue(null);
  mocks.sendNotification.mockResolvedValue("sent");
});

describe("contact inquiry discount verification", () => {
  it("stores structured valid-code lookup details but returns only a neutral message", async () => {
    mocks.findUnique.mockResolvedValue({
      id: "subscription-1",
      email: "subscriber@example.com",
      status: "UNSUBSCRIBED",
      discountPercent: 15,
      discountRedeemedAt: null,
    });

    const response = await POST(
      request({
        name: "Angler",
        email: "subscriber@example.com",
        message: "I would like to order.",
        discountCode: " crew-01abcdef ",
      }),
    );

    expect(response.status).toBe(201);
    expect(response.headers.get("cache-control")).toBe("no-store");
    const body = await response.json();
    expect(body).toEqual({
      ok: true,
      message: "Message sent. We'll verify your code and apply it to your order.",
    });
    expect(mocks.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { discountCode: "CREW-01ABCDEF" } }),
    );
    expect(mocks.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        discountCode: "CREW-01ABCDEF",
        discountCodeStatus: "VALID",
        discountSubscriberEmail: "subscriber@example.com",
        discountPercent: 15,
      }),
      select: { id: true, createdAt: true },
    });
    expect(mocks.sendNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        leadId: "lead-1",
        email: "subscriber@example.com",
        discountCode: "CREW-01ABCDEF",
        discountCodeStatus: "VALID",
        discountSubscriberEmail: "subscriber@example.com",
        discountPercent: 15,
      }),
    );
    expect(JSON.stringify(body)).not.toContain("subscriber@example.com");
  });

  it("persists unknown codes as NOT_FOUND without revealing the result", async () => {
    const response = await POST(
      request({
        name: "Angler",
        email: "customer@example.com",
        message: "Order inquiry",
        discountCode: "CREW-01ABCDEF",
      }),
    );
    expect(await response.json()).toMatchObject({ ok: true });
    expect(mocks.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        discountCodeStatus: "NOT_FOUND",
        discountSubscriberEmail: null,
        discountPercent: null,
      }),
      select: { id: true, createdAt: true },
    });
  });

  it("rejects cross-email discount code usage before creating a lead", async () => {
    mocks.findUnique.mockResolvedValue({
      id: "subscription-1",
      email: "usera@example.com",
      status: "CONFIRMED",
      discountPercent: 15,
      discountRedeemedAt: null,
    });

    const response = await POST(
      request({
        name: "Angler",
        email: "userb@example.com",
        message: "I would like to use this code.",
        discountCode: "CREW-01ABCDEF",
      }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "This discount code is tied to a different email address.",
    });
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.sendNotification).not.toHaveBeenCalled();
  });

  it("rate-limits public inquiry code lookup attempts", async () => {
    const limited = Response.json({ error: "Rate limited" }, { status: 429 });
    mocks.applyRateLimit.mockResolvedValue({ allowed: false });
    mocks.rateLimitResponse.mockReturnValue(limited);

    const response = await POST(
      request({
        name: "Angler",
        email: "customer@example.com",
        message: "Order inquiry",
        discountCode: "CREW-01ABCDEF",
      }),
    );
    expect(response.status).toBe(429);
    expect(mocks.findUnique).not.toHaveBeenCalled();
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("keeps inquiry success when Resend notification fails", async () => {
    mocks.sendNotification.mockRejectedValue(new Error("provider details with PII"));
    const warning = vi.spyOn(console, "warn").mockImplementation(() => {});

    const response = await POST(
      request({
        name: "Angler",
        email: "customer@example.com",
        message: "Order inquiry",
      }),
    );

    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({ ok: true });
    expect(mocks.create).toHaveBeenCalledOnce();
    expect(warning).toHaveBeenCalledWith("Contact inquiry notification could not be sent.");
    expect(JSON.stringify(warning.mock.calls)).not.toMatch(
      /customer@example.com|provider details with PII/i,
    );
    warning.mockRestore();
  });

  it("skips notification safely when the owner address is not configured", async () => {
    mocks.sendNotification.mockResolvedValue("skipped");
    const warning = vi.spyOn(console, "warn").mockImplementation(() => {});

    const response = await POST(
      request({
        name: "Angler",
        email: "customer@example.com",
        message: "Order inquiry",
      }),
    );

    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({ ok: true });
    expect(warning).toHaveBeenCalledWith(
      "Contact inquiry notification skipped: OWNER_NOTIFICATION_EMAIL is unset.",
    );
    warning.mockRestore();
  });
});
