import { beforeEach, describe, expect, it, vi } from "vitest";
import { hashNewsletterToken } from "@/lib/newsletter/tokens";

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  create: vi.fn(),
  updateMany: vi.fn(),
  transaction: vi.fn(),
  applyRateLimit: vi.fn(),
  applyRateLimitByValue: vi.fn(),
  sendConfirmation: vi.fn(),
  sendWelcome: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    newsletterSubscription: {
      findUnique: mocks.findUnique,
      create: mocks.create,
      updateMany: mocks.updateMany,
    },
    $transaction: mocks.transaction,
  },
}));
vi.mock("@/lib/request-security", () => ({
  applyRateLimit: mocks.applyRateLimit,
  applyRateLimitByValue: mocks.applyRateLimitByValue,
  readJsonBody: async (request: Request) => request.json(),
  RequestBodyError: class RequestBodyError extends Error {
    status = 400;
  },
  rateLimitResponse: () => Response.json({ error: "Rate limited" }, { status: 429 }),
}));
vi.mock("@/lib/newsletter/email", () => ({
  buildNewsletterUrl: (_path: string, token: string) =>
    `https://calyptobait.com/confirm?token=${token}`,
  sendNewsletterConfirmationEmail: mocks.sendConfirmation,
  sendNewsletterWelcomeEmail: mocks.sendWelcome,
}));

import { POST as subscribe } from "@/app/api/subscribe/route";
import { POST as confirm } from "@/app/api/subscribe/confirm/route";
import { POST as unsubscribe } from "@/app/api/subscribe/unsubscribe/route";

const allow = { allowed: true, limit: 10, remaining: 9, resetAt: 0 };

function request(path: string, body: unknown) {
  return new Request(`https://calyptobait.com${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-real-ip": "203.0.113.10" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.applyRateLimit.mockResolvedValue(allow);
  mocks.applyRateLimitByValue.mockResolvedValue(allow);
  mocks.create.mockResolvedValue({ id: "subscription-1" });
  mocks.updateMany.mockResolvedValue({ count: 1 });
});

describe("newsletter subscribe and confirmation APIs", () => {
  it("persists only a confirmation-token hash before sending confirmation mail", async () => {
    mocks.findUnique.mockResolvedValue(null);

    const response = await subscribe(request("/api/subscribe", { email: "  Angler@Example.com " }));

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(await response.json()).toEqual({
      ok: true,
      message: "Check your inbox to confirm your subscription.",
    });
    const saved = mocks.create.mock.calls[0]?.[0].data;
    expect(saved).toMatchObject({
      email: "angler@example.com",
      status: "PENDING_CONFIRMATION",
      source: "newsletter-popup",
      consentVersion: expect.any(String),
      consentText: expect.any(String),
    });
    expect(saved.confirmationTokenHash).toMatch(/^[a-f0-9]{64}$/u);
    expect(JSON.stringify(saved)).not.toContain("token=");
    expect(mocks.sendConfirmation).toHaveBeenCalledOnce();
    expect(mocks.applyRateLimitByValue).toHaveBeenCalledWith(
      "newsletter-subscribe-email",
      "angler@example.com",
      3,
      600,
    );
  });

  it("returns the same generic response for confirmed subscribers without resending", async () => {
    mocks.findUnique.mockResolvedValue({
      id: "subscription-1",
      status: "CONFIRMED",
      confirmationSentAt: new Date(),
    });

    const response = await subscribe(request("/api/subscribe", { email: "angler@example.com" }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      message: "Check your inbox to confirm your subscription.",
    });
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.updateMany).not.toHaveBeenCalled();
    expect(mocks.sendConfirmation).not.toHaveBeenCalled();
  });

  it("silently acknowledges the honeypot without persisting or sending", async () => {
    const response = await subscribe(
      request("/api/subscribe", { email: "bot@example.com", website: "spam" }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      message: "Check your inbox to confirm your subscription.",
    });
    expect(mocks.findUnique).not.toHaveBeenCalled();
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("keeps a saved signup and returns generic success when Resend is unavailable", async () => {
    mocks.findUnique.mockResolvedValue(null);
    mocks.sendConfirmation.mockRejectedValue(new Error("provider failure"));
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await subscribe(request("/api/subscribe", { email: "angler@example.com" }));

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ok: true });
    expect(mocks.create).toHaveBeenCalledOnce();
    expect(consoleError).toHaveBeenCalledWith("Newsletter confirmation email could not be sent.");
    expect(consoleError.mock.calls.flat().join(" ")).not.toContain("angler@example.com");
    consoleError.mockRestore();
  });

  it("confirms once, returns the same code on a repeated click, and sends one welcome email", async () => {
    const token = "A".repeat(43);
    const tokenHash = hashNewsletterToken(token);
    const pending = {
      id: "subscription-1",
      email: "angler@example.com",
      status: "PENDING_CONFIRMATION",
      confirmationTokenHash: tokenHash,
      confirmationSentAt: new Date(),
      confirmedAt: null,
      discountCode: null,
      unsubscribeTokenHash: null,
    };
    mocks.findUnique.mockResolvedValueOnce(pending).mockResolvedValueOnce({
      confirmationTokenHash: tokenHash,
      status: "CONFIRMED",
      discountCode: "CREW-ABCD1234",
    });
    mocks.transaction.mockImplementation(async (callback) =>
      callback({
        newsletterSubscription: {
          updateMany: vi.fn().mockResolvedValue({ count: 1 }),
          findUnique: vi.fn().mockResolvedValue({
            status: "CONFIRMED",
            discountCode: "CREW-ABCD1234",
          }),
        },
      }),
    );

    const first = await confirm(request("/api/subscribe/confirm", { token }));
    const second = await confirm(request("/api/subscribe/confirm", { token }));

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(await first.json()).toEqual({ ok: true, discountCode: "CREW-ABCD1234" });
    expect(await second.json()).toEqual({ ok: true, discountCode: "CREW-ABCD1234" });
    expect(mocks.transaction).toHaveBeenCalledOnce();
    expect(mocks.sendWelcome).toHaveBeenCalledOnce();
  });

  it("retries confirmation when a unique discount-code collision occurs", async () => {
    const token = "B".repeat(43);
    const pending = {
      id: "subscription-2",
      email: "other@example.com",
      status: "PENDING_CONFIRMATION",
      confirmationTokenHash: hashNewsletterToken(token),
      confirmationSentAt: new Date(),
      confirmedAt: null,
      discountCode: null,
      unsubscribeTokenHash: null,
    };
    mocks.findUnique.mockResolvedValueOnce(pending);
    mocks.transaction
      .mockRejectedValueOnce({ code: "P2002" })
      .mockImplementationOnce(async (callback) =>
        callback({
          newsletterSubscription: {
            updateMany: vi.fn().mockResolvedValue({ count: 1 }),
            findUnique: vi.fn().mockResolvedValue({
              status: "CONFIRMED",
              discountCode: "CREW-RETRY123",
            }),
          },
        }),
      );

    const response = await confirm(request("/api/subscribe/confirm", { token }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, discountCode: "CREW-RETRY123" });
    expect(mocks.transaction).toHaveBeenCalledTimes(2);
    expect(mocks.sendWelcome).toHaveBeenCalledOnce();
  });

  it("unsubscribes only after an explicit POST using the token", async () => {
    const token = "C".repeat(43);
    const tokenHash = hashNewsletterToken(token);
    mocks.findUnique.mockResolvedValue({
      id: "subscription-3",
      status: "CONFIRMED",
      unsubscribeTokenHash: tokenHash,
    });

    const response = await unsubscribe(request("/api/subscribe/unsubscribe", { token }));

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ok: true });
    expect(mocks.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: "subscription-3",
          status: { in: ["PENDING_CONFIRMATION", "CONFIRMED"] },
        },
        data: expect.objectContaining({ status: "UNSUBSCRIBED" }),
      }),
    );
  });

  it("rejects expired confirmation tokens with a clear resubscribe message", async () => {
    const token = "D".repeat(43);
    mocks.findUnique.mockResolvedValue({
      id: "subscription-4",
      email: "expired@example.com",
      status: "PENDING_CONFIRMATION",
      confirmationTokenHash: hashNewsletterToken(token),
      confirmationSentAt: new Date(Date.now() - 25 * 60 * 60 * 1000),
      discountCode: null,
    });

    const response = await confirm(request("/api/subscribe/confirm", { token }));

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: expect.stringContaining("Please sign up again"),
    });
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
});
