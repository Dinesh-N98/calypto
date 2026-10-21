import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAdminRequest: vi.fn(),
  getAdminAnalytics: vi.fn(),
}));

vi.mock("@/lib/admin", () => ({ requireAdminRequest: mocks.requireAdminRequest }));
vi.mock("@/lib/ga-analytics", () => ({ getAdminAnalytics: mocks.getAdminAnalytics }));

import { GET } from "@/app/api/admin/analytics/route";

describe("admin analytics route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAdminRequest.mockResolvedValue({ ok: true, user: { id: "admin-1" } });
    mocks.getAdminAnalytics.mockResolvedValue({
      range: "7d",
      summary: { activeUsers: 10, pageviews: 20, sessions: 15, averageSessionDuration: 80 },
    });
  });

  it("returns the admin guard response without querying analytics for non-admin users", async () => {
    const response = Response.json({ error: "You are not authorized." }, { status: 403 });
    mocks.requireAdminRequest.mockResolvedValue({ ok: false, response });

    const result = await GET(new Request("https://example.test/api/admin/analytics?range=7d"));

    expect(result.status).toBe(403);
    expect(mocks.getAdminAnalytics).not.toHaveBeenCalled();
  });

  it("returns 401 for unauthenticated callers without querying analytics", async () => {
    const response = Response.json({ error: "You must be signed in." }, { status: 401 });
    mocks.requireAdminRequest.mockResolvedValue({ ok: false, response });

    const result = await GET(new Request("https://example.test/api/admin/analytics?range=7d"));

    expect(result.status).toBe(401);
    expect(mocks.getAdminAnalytics).not.toHaveBeenCalled();
  });

  it("returns cached analytics data for an authorized admin and a valid range", async () => {
    mocks.getAdminAnalytics.mockResolvedValueOnce({
      range: "30d",
      summary: { activeUsers: 10, pageviews: 20, sessions: 15, averageSessionDuration: 80 },
    });
    const response = await GET(new Request("https://example.test/api/admin/analytics?range=30d"));

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(mocks.getAdminAnalytics).toHaveBeenCalledWith("30d");
    expect(await response.json()).toMatchObject({ range: "30d" });
  });

  it("rejects unsupported ranges before querying analytics", async () => {
    const response = await GET(new Request("https://example.test/api/admin/analytics?range=all"));

    expect(response.status).toBe(400);
    expect(mocks.getAdminAnalytics).not.toHaveBeenCalled();
  });
});
