import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAdminPage: vi.fn(),
  leadFindMany: vi.fn(),
  userFindFirst: vi.fn(),
  userFindMany: vi.fn(),
  leadFindUnique: vi.fn(),
  orderFindUnique: vi.fn(),
  interactionCreate: vi.fn(),
  transaction: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/admin", () => ({ requireAdminPage: mocks.requireAdminPage }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: mocks.transaction,
    lead: { findMany: mocks.leadFindMany },
    user: { findFirst: mocks.userFindFirst, findMany: mocks.userFindMany },
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

import {
  createCrmInteraction,
  getCrmCustomerProfile,
  getCrmCustomers,
  getCrmLeads,
} from "@/lib/actions/crm";

beforeEach(() => {
  mocks.requireAdminPage.mockResolvedValue({
    id: "admin-1",
    name: "Store Admin",
    email: "admin@example.com",
    role: "ADMIN",
  });
  mocks.leadFindMany.mockResolvedValue([]);
  mocks.userFindFirst.mockResolvedValue(null);
  mocks.userFindMany.mockResolvedValue([]);
  mocks.leadFindUnique.mockResolvedValue(null);
  mocks.orderFindUnique.mockResolvedValue(null);
  mocks.interactionCreate.mockResolvedValue({
    id: "interaction-1",
    type: "NOTE",
    occurredAt: new Date("2026-10-13T12:00:00.000Z"),
  });
  mocks.transaction.mockImplementation((callback) =>
    callback({
      user: { findFirst: mocks.userFindFirst },
      lead: { findUnique: mocks.leadFindUnique },
      order: { findUnique: mocks.orderFindUnique },
      crmInteraction: { create: mocks.interactionCreate },
    }),
  );
});

describe("CRM server actions", () => {
  it("bounds lead pages and returns a cursor when more records exist", async () => {
    mocks.leadFindMany.mockResolvedValue([{ id: "lead-3" }, { id: "lead-2" }, { id: "lead-1" }]);

    const result = await getCrmLeads({ limit: 2 });

    expect(result).toMatchObject({
      ok: true,
      leads: [{ id: "lead-3" }, { id: "lead-2" }],
      nextCursor: "lead-2",
    });
    expect(mocks.requireAdminPage).toHaveBeenCalledWith("/admin/crm/leads");
    expect(mocks.leadFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 3,
        orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      }),
    );
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
    await expect(getCrmCustomers()).rejects.toThrow("Not authorized");
    await expect(getCrmCustomerProfile("customer-1")).rejects.toThrow("Not authorized");
    await expect(
      createCrmInteraction({ customerId: "customer-1", content: "Private note" }),
    ).rejects.toThrow("Not authorized");

    expect(mocks.leadFindMany).not.toHaveBeenCalled();
    expect(mocks.userFindFirst).not.toHaveBeenCalled();
    expect(mocks.userFindMany).not.toHaveBeenCalled();
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
});
