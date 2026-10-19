import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  count: vi.fn(),
  findMany: vi.fn(),
  groupBy: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: { order: mocks },
}));

import { getAdminOrders } from "@/lib/admin-orders";

describe("getAdminOrders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.count
      .mockResolvedValueOnce(23)
      .mockResolvedValueOnce(100)
      .mockResolvedValueOnce(8)
      .mockResolvedValueOnce(12)
      .mockResolvedValueOnce(20);
    mocks.findMany.mockResolvedValue([]);
    mocks.groupBy.mockResolvedValue([{ currency: "USD", _sum: { totalCents: 34500 } }]);
  });

  it("applies server-side filters, sorting, pagination, and unfiltered summary metrics", async () => {
    const from = new Date("2026-10-01T00:00:00.000Z");
    const to = new Date("2026-10-20T00:00:00.000Z");
    const result = await getAdminOrders({
      search: "ada@example.com",
      status: "SHIPPED",
      from,
      to,
      page: 3,
      pageSize: 10,
      sort: "total",
      direction: "asc",
    });

    expect(mocks.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 20,
        take: 10,
        orderBy: [
          { totalCents: "asc" },
          { createdAt: "desc" },
          { id: "desc" },
        ],
        where: {
          AND: [
            {
              OR: expect.arrayContaining([
                { email: { contains: "ada@example.com", mode: "insensitive" } },
              ]),
            },
            { fulfillmentStatus: "SHIPPED" },
            { createdAt: { gte: from, lt: to } },
          ],
        },
      }),
    );
    expect(result).toMatchObject({
      totalOrders: 23,
      totalPages: 3,
      page: 3,
      summary: {
        totalOrders: 100,
        pendingOrders: 8,
        shippedOrders: 12,
        unfulfilledOrders: 20,
        revenueByCurrency: [{ currency: "USD", totalCents: 34500 }],
      },
    });
  });

  it("clamps a requested page to the last available page", async () => {
    mocks.count.mockReset();
    mocks.count
      .mockResolvedValueOnce(11)
      .mockResolvedValueOnce(11)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(4)
      .mockResolvedValueOnce(5);

    const result = await getAdminOrders({
      page: 9,
      pageSize: 10,
      sort: "date",
      direction: "desc",
    });

    expect(result.page).toBe(2);
    expect(mocks.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 10, take: 10 }),
    );
  });
});
