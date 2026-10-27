import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAdminRequest: vi.fn(),
  applyRateLimit: vi.fn(),
  rateLimitResponse: vi.fn(),
  findUnique: vi.fn(),
  updateMany: vi.fn(),
  createRedemption: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("@/lib/admin", () => ({ requireAdminRequest: mocks.requireAdminRequest }));
vi.mock("@/lib/request-security", () => ({
  applyRateLimit: mocks.applyRateLimit,
  rateLimitResponse: mocks.rateLimitResponse,
  readJsonBody: async (request: Request) => request.json(),
  RequestBodyError: class RequestBodyError extends Error {
    status = 400;
  },
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    newsletterSubscription: { findUnique: mocks.findUnique },
    $transaction: mocks.transaction,
  },
}));

import {
  GET,
  POST,
} from "@/app/api/admin/newsletter-discounts/route";

const authorized = { ok: true, user: { id: "admin-1" } };
const allowed = { allowed: true, limit: 30, remaining: 29, resetAt: 0 };
const subscription = {
  id: "subscription-1",
  email: "subscriber@example.com",
  status: "CONFIRMED",
  discountCode: "CREW-01ABCDEF",
  discountPercent: 15,
  discountRedeemedAt: null,
};

function request(path: string, method: "GET" | "POST" = "GET", body?: unknown) {
  return new Request(`https://calyptobait.com${path}`, {
    method,
    headers: { "content-type": "application/json", "x-real-ip": "203.0.113.20" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireAdminRequest.mockResolvedValue(authorized);
  mocks.applyRateLimit.mockResolvedValue(allowed);
  mocks.rateLimitResponse.mockReturnValue(Response.json({ error: "Rate limited" }, { status: 429 }));
  mocks.findUnique.mockResolvedValue(subscription);
  mocks.updateMany.mockResolvedValue({ count: 1 });
  mocks.createRedemption.mockResolvedValue({ id: "redemption-1" });
  mocks.transaction.mockImplementation(async (callback) =>
    callback({
      newsletterSubscription: {
        findUnique: mocks.findUnique,
        updateMany: mocks.updateMany,
      },
      newsletterDiscountRedemption: { create: mocks.createRedemption },
    }),
  );
});

describe("admin newsletter discount routes", () => {
  it("enforces server-side admin auth before lookups or redemption", async () => {
    const response = Response.json({ error: "You are not authorized." }, { status: 403 });
    mocks.requireAdminRequest.mockResolvedValue({ ok: false, response });

    expect((await GET(request("/api/admin/newsletter-discounts?code=CREW-01ABCDEF"))).status).toBe(
      403,
    );
    expect(
      (
        await POST(
          request("/api/admin/newsletter-discounts", "POST", { code: "CREW-01ABCDEF" }),
        )
      ).status,
    ).toBe(403);
    expect(mocks.applyRateLimit).not.toHaveBeenCalled();
    expect(mocks.findUnique).not.toHaveBeenCalled();
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("returns private no-store lookup data to an authorized admin", async () => {
    const response = await GET(
      request("/api/admin/newsletter-discounts?code=%20crew-01abcdef%20"),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(body.subscription).toMatchObject({
      code: "CREW-01ABCDEF",
      email: "subscriber@example.com",
      discountPercent: 15,
      lookupStatus: "VALID",
    });
  });

  it("atomically marks a code redeemed and records the acting admin", async () => {
    const response = await POST(
      request("/api/admin/newsletter-discounts", "POST", {
        code: " crew-01abcdef ",
        orderReference: "CAL-ORDER-001",
        note: "Manual first-order discount.",
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.redeemed).toBe(true);
    expect(mocks.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: "subscription-1",
          discountRedeemedAt: null,
          status: { in: ["CONFIRMED", "UNSUBSCRIBED"] },
        }),
        data: expect.objectContaining({
          discountRedeemedAt: expect.any(Date),
          redeemedOrderId: "CAL-ORDER-001",
        }),
      }),
    );
    expect(mocks.createRedemption).toHaveBeenCalledWith({
      data: expect.objectContaining({
        subscriptionId: "subscription-1",
        redeemedByUserId: "admin-1",
        orderReference: "CAL-ORDER-001",
        note: "Manual first-order discount.",
      }),
    });
  });

  it("rejects a repeated redemption without creating a second audit record", async () => {
    const redeemedAt = new Date();
    mocks.findUnique
      .mockResolvedValueOnce(subscription)
      .mockResolvedValueOnce(subscription)
      .mockResolvedValueOnce({ status: "CONFIRMED", discountRedeemedAt: redeemedAt });
    mocks.updateMany.mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 0 });

    const first = await POST(
      request("/api/admin/newsletter-discounts", "POST", { code: "CREW-01ABCDEF" }),
    );
    const second = await POST(
      request("/api/admin/newsletter-discounts", "POST", { code: "CREW-01ABCDEF" }),
    );

    expect(first.status).toBe(200);
    expect(second.status).toBe(409);
    expect(await second.json()).toMatchObject({
      redeemed: false,
      lookupStatus: "ALREADY_REDEEMED",
    });
    expect(mocks.createRedemption).toHaveBeenCalledTimes(1);
  });
});
