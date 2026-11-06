import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAdminRequest: vi.fn(),
  findUnique: vi.fn(),
  upsert: vi.fn(),
}));

vi.mock("@/lib/admin", () => ({ requireAdminRequest: mocks.requireAdminRequest }));
vi.mock("@/lib/request-security", () => ({
  readJsonBody: async (request: Request) => request.json(),
  RequestBodyError: class RequestBodyError extends Error {
    status = 400;
  },
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    sriLankaShippingRateSettings: {
      findUnique: mocks.findUnique,
      upsert: mocks.upsert,
    },
  },
}));

import { GET, PUT } from "@/app/api/admin/shipping-rates/route";

const rates = {
  underOneKgCents: 300,
  oneToThreeKgCents: 500,
  overThreeKgCents: 1_000,
};

function request(method = "GET", body?: unknown) {
  return new Request("https://calyptobait.com/api/admin/shipping-rates", {
    method,
    headers: { "content-type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireAdminRequest.mockResolvedValue({ ok: true, user: { id: "admin-1" } });
  mocks.findUnique.mockResolvedValue(rates);
  mocks.upsert.mockResolvedValue(rates);
});

describe("admin Sri Lanka shipping rate settings", () => {
  it("requires admin authorization before reading or writing settings", async () => {
    const response = Response.json({ error: "You are not authorized." }, { status: 403 });
    mocks.requireAdminRequest.mockResolvedValue({ ok: false, response });

    expect((await GET()).status).toBe(403);
    expect((await PUT(request("PUT", rates))).status).toBe(403);
    expect(mocks.findUnique).not.toHaveBeenCalled();
    expect(mocks.upsert).not.toHaveBeenCalled();
  });

  it("returns private no-store settings to an administrator", async () => {
    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(await response.json()).toEqual({ rates });
  });

  it("saves all three USD tiers as integer cents", async () => {
    const response = await PUT(request("PUT", rates));

    expect(response.status).toBe(200);
    expect(mocks.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "LK" },
        create: { id: "LK", ...rates },
        update: rates,
      }),
    );
    expect(await response.json()).toEqual({ rates });
  });

  it.each([
    { ...rates, unknown: 10 },
    { ...rates, underOneKgCents: 0 },
    { ...rates, oneToThreeKgCents: 1.5 },
    { ...rates, overThreeKgCents: 1_000_001 },
  ])("rejects invalid rate settings", async (invalidRates) => {
    const response = await PUT(request("PUT", invalidRates));

    expect(response.status).toBe(400);
    expect(mocks.upsert).not.toHaveBeenCalled();
  });
});
