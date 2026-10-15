import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAdminPage: vi.fn(),
  leadFindMany: vi.fn(),
  leadCount: vi.fn(),
  leadGroupBy: vi.fn(),
  userFindFirst: vi.fn(),
  userFindMany: vi.fn(),
  leadFindUnique: vi.fn(),
  leadUpdateMany: vi.fn(),
  leadUpdate: vi.fn(),
  orderFindUnique: vi.fn(),
  interactionCreate: vi.fn(),
  interactionCreateMany: vi.fn(),
  transaction: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/admin", () => ({ requireAdminPage: mocks.requireAdminPage }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: mocks.transaction,
    lead: {
      findMany: mocks.leadFindMany,
      findUnique: mocks.leadFindUnique,
      count: mocks.leadCount,
      groupBy: mocks.leadGroupBy,
      updateMany: mocks.leadUpdateMany,
      update: mocks.leadUpdate,
    },
    crmInteraction: { create: mocks.interactionCreate, createMany: mocks.interactionCreateMany },
    user: { findFirst: mocks.userFindFirst, findMany: mocks.userFindMany },
    order: { findUnique: mocks.orderFindUnique },
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

import {
  createCrmInteraction,
  getCrmCustomerProfile,
  getCrmCustomers,
  getCrmLeadCountries,
  getCrmLeadDetail,
  getCrmLeadSummaryMetrics,
  getCrmLeadStates,
  getCrmLeads,
  bulkUpdateCrmLeadStatus,
  updateCrmLeadStatus,
  updateCrmLeadNotes,
} from "@/lib/actions/crm";

beforeEach(() => {
  mocks.requireAdminPage.mockResolvedValue({
    id: "admin-1",
    name: "Store Admin",
    email: "admin@example.com",
    role: "ADMIN",
  });
  mocks.leadFindMany.mockResolvedValue([]);
  mocks.leadCount.mockResolvedValue(0);
  mocks.leadGroupBy.mockResolvedValue([]);
  mocks.userFindFirst.mockResolvedValue(null);
  mocks.userFindMany.mockResolvedValue([]);
  mocks.leadFindUnique.mockResolvedValue(null);
  mocks.leadUpdateMany.mockResolvedValue({ count: 1 });
  mocks.leadUpdate.mockResolvedValue({ id: "lead-1", notes: "Internal note" });
  mocks.orderFindUnique.mockResolvedValue(null);
  mocks.interactionCreate.mockResolvedValue({
    id: "interaction-1",
    type: "NOTE",
    occurredAt: new Date("2026-10-13T12:00:00.000Z"),
  });
  mocks.transaction.mockImplementation((callback) =>
    callback({
      user: { findFirst: mocks.userFindFirst },
      lead: {
        findUnique: mocks.leadFindUnique,
        findMany: mocks.leadFindMany,
        updateMany: mocks.leadUpdateMany,
      },
      order: { findUnique: mocks.orderFindUnique },
      crmInteraction: {
        create: mocks.interactionCreate,
        createMany: mocks.interactionCreateMany,
      },
    }),
  );
});

describe("CRM server actions", () => {
  it("uses the requested page offset and returns total page metadata", async () => {
    mocks.leadCount.mockResolvedValue(260);
    mocks.leadFindMany.mockResolvedValue([{ id: "lead-3" }, { id: "lead-2" }, { id: "lead-1" }]);

    const result = await getCrmLeads({ page: 3, limit: 100 });

    expect(result).toMatchObject({
      ok: true,
      leads: [{ id: "lead-3" }, { id: "lead-2" }, { id: "lead-1" }],
      totalCount: 260,
      page: 3,
      totalPages: 3,
    });
    expect(mocks.requireAdminPage).toHaveBeenCalledWith("/admin/crm/leads");
    expect(mocks.leadFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 200,
        take: 100,
        orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
        select: expect.objectContaining({
          country: true,
          city: true,
          state: true,
          address: true,
          website: true,
          message: true,
        }),
      }),
    );
  });

  it("clamps requested pages to the last page and defaults to 25 rows", async () => {
    mocks.leadCount.mockResolvedValue(30);

    const result = await getCrmLeads({ page: 8 });

    expect(result).toMatchObject({ ok: true, page: 2, totalCount: 30, totalPages: 2 });
    expect(mocks.leadFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 25, take: 25 }),
    );
  });

  it("searches lead location fields and filters by country and state", async () => {
    await getCrmLeads({ search: "Toronto", country: "Canada", state: "Ontario" });

    expect(mocks.leadFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          country: { equals: "Canada", mode: "insensitive" },
          state: { equals: "Ontario", mode: "insensitive" },
          OR: [
            { name: { contains: "Toronto", mode: "insensitive" } },
            { email: { contains: "Toronto", mode: "insensitive" } },
            { company: { contains: "Toronto", mode: "insensitive" } },
            { country: { contains: "Toronto", mode: "insensitive" } },
            { city: { contains: "Toronto", mode: "insensitive" } },
            { address: { contains: "Toronto", mode: "insensitive" } },
          ],
        },
      }),
    );
  });

  it("returns distinct nonblank lead countries for the filter", async () => {
    mocks.leadFindMany.mockResolvedValue([
      { country: "Singapore" },
      { country: "Canada" },
      { country: null },
      { country: " " },
    ]);

    await expect(getCrmLeadCountries()).resolves.toEqual(["Canada", "Singapore"]);
    expect(mocks.requireAdminPage).toHaveBeenCalledWith("/admin/crm/leads");
    expect(mocks.leadFindMany).toHaveBeenCalledWith({
      where: { country: { not: null, notIn: [""] } },
      distinct: ["country"],
      orderBy: { country: "asc" },
      select: { country: true },
    });
  });

  it("returns distinct states optionally scoped to a selected country", async () => {
    mocks.leadFindMany.mockResolvedValue([
      { state: "Ontario" },
      { state: "Alberta" },
      { state: null },
      { state: " " },
    ]);

    await expect(getCrmLeadStates("Canada")).resolves.toEqual(["Alberta", "Ontario"]);
    expect(mocks.requireAdminPage).toHaveBeenCalledWith("/admin/crm/leads");
    expect(mocks.leadFindMany).toHaveBeenCalledWith({
      where: {
        state: { not: null, notIn: [""] },
        country: { equals: "Canada", mode: "insensitive" },
      },
      distinct: ["state"],
      orderBy: { state: "asc" },
      select: { state: true },
    });
  });

  it("selects only CRM-safe customer profile fields", async () => {
    mocks.userFindFirst.mockResolvedValue({
      id: "customer-1",
      name: "Customer",
      email: "customer@example.com",
      phone: null,
      orders: [],
      crmInteractions: [],
    });

    const result = await getCrmCustomerProfile("customer-1");

    expect(result).toMatchObject({ ok: true, customer: { orders: [], crmInteractions: [] } });
    expect(mocks.requireAdminPage).toHaveBeenCalledWith("/admin/crm/customers");
    expect(mocks.userFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "customer-1", role: "CUSTOMER" },
        select: expect.not.objectContaining({
          address: true,
          addresses: expect.anything(),
          hashedPassword: true,
          accounts: expect.anything(),
          sessions: expect.anything(),
        }),
      }),
    );
    const query = mocks.userFindFirst.mock.calls[0]?.[0];
    expect(query.select.orders).toMatchObject({
      take: 20,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    });
    expect(query.select.crmInteractions).toMatchObject({
      take: 50,
      orderBy: [{ occurredAt: "desc" }, { id: "desc" }],
    });
    expect(result.customer).not.toHaveProperty("hashedPassword");
    expect(result.customer).not.toHaveProperty("accounts");
    expect(result.customer).not.toHaveProperty("sessions");
    expect(result.customer).not.toHaveProperty("addresses");
  });

  it("rejects malformed filters before querying Prisma", async () => {
    const result = await getCrmLeads({ status: "NOT_A_STATUS", limit: 500 });

    expect(result).toMatchObject({ ok: false, error: "Lead filters are invalid." });
    expect(mocks.leadFindMany).not.toHaveBeenCalled();
  });

  it("returns global and filtered lead summary metrics with normalized country counts", async () => {
    mocks.leadCount.mockImplementation(({ where }) => {
      const scoped = where.status === "NEW" || where.AND?.[0]?.status === "NEW";
      if (!where.AND) return scoped ? 2 : 4;
      const contactField = where.AND[1].phone ? "phone" : "email";
      if (contactField === "phone") return scoped ? 1 : 2;
      return scoped ? 2 : 3;
    });
    mocks.leadGroupBy.mockImplementation(({ by }) =>
      by[0] === "status"
        ? [
            { status: "NEW", _count: { _all: 2 } },
            { status: "CONTACTED", _count: { _all: 2 } },
          ]
        : [
            { country: " Canada ", _count: { _all: 2 } },
            { country: "canada", _count: { _all: 1 } },
            { country: null, _count: { _all: 1 } },
          ],
    );

    const result = await getCrmLeadSummaryMetrics({ status: "NEW" });

    expect(result).toMatchObject({
      ok: true,
      global: {
        totalCount: 4,
        countryDistribution: [{ country: "Canada", count: 3 }],
        statusCounts: { NEW: 2, CONTACTED: 2, QUALIFIED: 0, CONVERTED: 0, CLOSED: 0 },
        contactCoverage: { phoneCount: 2, phonePercent: 50, emailCount: 3, emailPercent: 75 },
      },
      scoped: {
        totalCount: 2,
        contactCoverage: { phoneCount: 1, phonePercent: 50, emailCount: 2, emailPercent: 100 },
      },
    });
    expect(mocks.requireAdminPage).toHaveBeenCalledWith("/admin/crm/leads");
    expect(mocks.leadGroupBy).toHaveBeenCalledWith(
      expect.objectContaining({ by: ["status"], where: { status: "NEW" } }),
    );
  });

  it("rejects malformed summary filters before aggregation", async () => {
    const result = await getCrmLeadSummaryMetrics({ status: "UNKNOWN" });

    expect(result).toMatchObject({ ok: false, error: "Lead filters are invalid." });
    expect(mocks.leadGroupBy).not.toHaveBeenCalled();
  });

  it("updates one lead and records a status-change interaction in the same transaction", async () => {
    mocks.leadFindUnique.mockResolvedValue({ id: "lead-1", status: "NEW" });

    const result = await updateCrmLeadStatus({ leadId: "lead-1", status: "CONTACTED" });

    expect(result).toEqual({
      ok: true,
      lead: { id: "lead-1", status: "CONTACTED" },
      changed: true,
    });
    expect(mocks.transaction).toHaveBeenCalledOnce();
    expect(mocks.leadUpdateMany).toHaveBeenCalledWith({
      where: { id: "lead-1", status: "NEW" },
      data: { status: "CONTACTED" },
    });
    expect(mocks.interactionCreate).toHaveBeenCalledWith({
      data: {
        type: "OTHER",
        subject: "Lead status changed",
        content: "Status changed from NEW to CONTACTED.",
        authorId: "admin-1",
        leadId: "lead-1",
      },
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/admin/crm/leads");
  });

  it("does not log an interaction when the requested lead status is unchanged", async () => {
    mocks.leadFindUnique.mockResolvedValue({ id: "lead-1", status: "NEW" });

    await expect(updateCrmLeadStatus({ leadId: "lead-1", status: "NEW" })).resolves.toEqual({
      ok: true,
      lead: { id: "lead-1", status: "NEW" },
      changed: false,
    });
    expect(mocks.leadUpdateMany).not.toHaveBeenCalled();
    expect(mocks.interactionCreate).not.toHaveBeenCalled();
  });

  it("bulk-updates leads and records one interaction per changed lead transactionally", async () => {
    mocks.leadFindMany.mockResolvedValue([
      { id: "lead-1", status: "NEW" },
      { id: "lead-2", status: "QUALIFIED" },
    ]);
    mocks.leadUpdateMany.mockResolvedValue({ count: 2 });

    await expect(
      bulkUpdateCrmLeadStatus({ leadIds: ["lead-1", "lead-2"], status: "CONTACTED" }),
    ).resolves.toEqual({ ok: true, updatedCount: 2 });

    expect(mocks.leadUpdateMany).toHaveBeenCalledWith({
      where: { id: { in: ["lead-1", "lead-2"] } },
      data: { status: "CONTACTED" },
    });
    expect(mocks.interactionCreateMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          leadId: "lead-1",
          authorId: "admin-1",
          content: "Status changed from NEW to CONTACTED.",
        }),
        expect.objectContaining({
          leadId: "lead-2",
          authorId: "admin-1",
          content: "Status changed from QUALIFIED to CONTACTED.",
        }),
      ],
    });
  });

  it("validates status updates and duplicate or oversized bulk selections", async () => {
    await expect(
      updateCrmLeadStatus({ leadId: "lead-1", status: "INVALID" }),
    ).resolves.toMatchObject({ ok: false });
    await expect(
      bulkUpdateCrmLeadStatus({ leadIds: ["lead-1", "lead-1"], status: "CLOSED" }),
    ).resolves.toMatchObject({ ok: false });
    await expect(
      bulkUpdateCrmLeadStatus({
        leadIds: Array.from({ length: 101 }, (_, index) => `lead-${index}`),
        status: "CLOSED",
      }),
    ).resolves.toMatchObject({ ok: false });
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("returns a lead with the 50 most recent interactions", async () => {
    mocks.leadFindUnique.mockResolvedValue({
      id: "lead-1",
      interactions: [{ id: "interaction-1" }],
    });

    const result = await getCrmLeadDetail(" lead-1 ");

    expect(result).toMatchObject({ ok: true, lead: { id: "lead-1" } });
    expect(mocks.leadFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "lead-1" },
        include: {
          interactions: expect.objectContaining({
            take: 50,
            orderBy: [{ occurredAt: "desc" }, { id: "desc" }],
          }),
        },
      }),
    );
  });

  it("validates lead detail IDs before querying", async () => {
    await expect(getCrmLeadDetail("")).resolves.toMatchObject({ ok: false });
    expect(mocks.leadFindUnique).not.toHaveBeenCalled();
  });

  it("updates internal lead notes after validating input and revalidates the CRM page", async () => {
    const result = await updateCrmLeadNotes({ leadId: " lead-1 ", notes: "  Internal note  " });

    expect(result).toEqual({ ok: true, lead: { id: "lead-1", notes: "Internal note" } });
    expect(mocks.requireAdminPage).toHaveBeenCalledWith("/admin/crm/leads");
    expect(mocks.leadUpdate).toHaveBeenCalledWith({
      where: { id: "lead-1" },
      data: { notes: "Internal note" },
      select: { id: true, notes: true },
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/admin/crm/leads");
  });

  it("rejects invalid lead notes without writing", async () => {
    await expect(updateCrmLeadNotes({ leadId: "", notes: "note" })).resolves.toMatchObject({
      ok: false,
    });
    await expect(
      updateCrmLeadNotes({ leadId: "lead-1", notes: "n".repeat(5001) }),
    ).resolves.toMatchObject({ ok: false });
    expect(mocks.leadUpdate).not.toHaveBeenCalled();
  });

  it("returns the empty customer profile without looking up email-matched guest orders", async () => {
    mocks.userFindFirst.mockResolvedValue({
      id: "customer-1",
      name: "Customer",
      firstName: null,
      lastName: null,
      email: "guest@example.com",
      phone: null,
      orders: [],
      crmInteractions: [],
    });

    const result = await getCrmCustomerProfile("customer-1");

    expect(result).toMatchObject({ ok: true, customer: { orders: [] } });
    expect(mocks.userFindFirst).toHaveBeenCalledTimes(1);
    expect(mocks.userFindFirst.mock.calls[0]?.[0].where).toEqual({
      id: "customer-1",
      role: "CUSTOMER",
    });
  });

  it("bounds customer pages and filters to customer-role accounts", async () => {
    mocks.userFindMany.mockResolvedValue([{ id: "customer-2" }, { id: "customer-1" }]);

    const result = await getCrmCustomers({ limit: 1, search: "alex" });

    expect(result).toMatchObject({
      ok: true,
      customers: [{ id: "customer-2" }],
      nextCursor: "customer-2",
    });
    expect(mocks.requireAdminPage).toHaveBeenCalledWith("/admin/crm/customers");
    expect(mocks.userFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ role: "CUSTOMER" }),
        take: 2,
      }),
    );
  });

  it("rejects interactions without a CRM subject", async () => {
    const result = await createCrmInteraction({ content: "Called about order status." });

    expect(result).toMatchObject({ ok: false });
    expect(mocks.transaction).not.toHaveBeenCalled();
    expect(mocks.interactionCreate).not.toHaveBeenCalled();
  });

  it("uses the authenticated admin as author when creating an interaction", async () => {
    mocks.userFindFirst.mockResolvedValue({ id: "customer-1" });

    const result = await createCrmInteraction({
      customerId: "customer-1",
      content: "Customer requested a callback.",
    });

    expect(result).toMatchObject({ ok: true, interaction: { id: "interaction-1" } });
    expect(mocks.interactionCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          authorId: "admin-1",
          customerId: "customer-1",
          content: "Customer requested a callback.",
        }),
      }),
    );
  });

  it("does not read CRM data or write interactions when the admin guard denies access", async () => {
    const denied = new Error("Not authorized");
    mocks.requireAdminPage.mockRejectedValue(denied);

    await expect(getCrmLeads()).rejects.toThrow("Not authorized");
    await expect(getCrmLeadSummaryMetrics()).rejects.toThrow("Not authorized");
    await expect(getCrmLeadDetail("lead-1")).rejects.toThrow("Not authorized");
    await expect(updateCrmLeadNotes({ leadId: "lead-1", notes: "Private note" })).rejects.toThrow(
      "Not authorized",
    );
    await expect(updateCrmLeadStatus({ leadId: "lead-1", status: "CLOSED" })).rejects.toThrow(
      "Not authorized",
    );
    await expect(
      bulkUpdateCrmLeadStatus({ leadIds: ["lead-1"], status: "CLOSED" }),
    ).rejects.toThrow("Not authorized");
    await expect(getCrmCustomers()).rejects.toThrow("Not authorized");
    await expect(getCrmCustomerProfile("customer-1")).rejects.toThrow("Not authorized");
    await expect(
      createCrmInteraction({ customerId: "customer-1", content: "Private note" }),
    ).rejects.toThrow("Not authorized");

    expect(mocks.leadFindMany).not.toHaveBeenCalled();
    expect(mocks.leadCount).not.toHaveBeenCalled();
    expect(mocks.leadGroupBy).not.toHaveBeenCalled();
    expect(mocks.leadFindUnique).not.toHaveBeenCalled();
    expect(mocks.leadUpdate).not.toHaveBeenCalled();
    expect(mocks.userFindFirst).not.toHaveBeenCalled();
    expect(mocks.userFindMany).not.toHaveBeenCalled();
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
});
