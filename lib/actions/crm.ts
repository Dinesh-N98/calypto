"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdminPage } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

const leadStatuses = ["NEW", "CONTACTED", "QUALIFIED", "CONVERTED", "CLOSED"] as const;
const interactionTypes = ["NOTE", "CALL", "EMAIL", "MEETING", "OTHER"] as const;

const leadQuerySchema = z
  .object({
    search: z.string().trim().max(100).optional(),
    status: z.enum(leadStatuses).optional(),
    country: z.string().trim().min(1).max(100).optional(),
    state: z.string().trim().min(1).max(100).optional(),
    cursor: z.string().trim().min(1).max(191).optional(),
    page: z.number().int().min(1).default(1),
    limit: z.number().int().min(1).max(100).default(25),
  })
  .strict();

const leadFiltersSchema = leadQuerySchema.omit({ cursor: true, page: true, limit: true });

const leadStatusUpdateSchema = z
  .object({
    leadId: z.string().trim().min(1).max(191),
    status: z.enum(leadStatuses),
  })
  .strict();

const bulkLeadStatusUpdateSchema = z
  .object({
    leadIds: z.array(z.string().trim().min(1).max(191)).min(1).max(100),
    status: z.enum(leadStatuses),
  })
  .strict()
  .refine(({ leadIds }) => new Set(leadIds).size === leadIds.length, {
    message: "Lead IDs must be unique.",
  });

const leadIdSchema = z.string().trim().min(1).max(191);

const customerQuerySchema = z
  .object({
    search: z.string().trim().max(100).optional(),
    cursor: z.string().trim().min(1).max(191).optional(),
    limit: z.number().int().min(1).max(50).default(25),
  })
  .strict();

const interactionSchema = z
  .object({
    type: z.enum(interactionTypes).default("NOTE"),
    subject: z.string().trim().max(200).optional(),
    content: z.string().trim().min(1).max(5000),
    occurredAt: z.iso.datetime().optional(),
    customerId: z.string().trim().min(1).max(191).optional(),
    leadId: z.string().trim().min(1).max(191).optional(),
    orderId: z.string().trim().min(1).max(191).optional(),
  })
  .strict()
  .refine(
    ({ customerId, leadId, orderId }) => Boolean(customerId || leadId || orderId),
    "Choose at least one customer, lead, or order.",
  );

type ActionError = { ok: false; error: string };

function buildLeadWhere(filters: z.infer<typeof leadFiltersSchema>): Prisma.LeadWhereInput {
  const { search, status, country, state } = filters;
  return {
    ...(status ? { status } : {}),
    ...(country ? { country: { equals: country, mode: "insensitive" } } : {}),
    ...(state ? { state: { equals: state, mode: "insensitive" } } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
            { company: { contains: search, mode: "insensitive" } },
            { country: { contains: search, mode: "insensitive" } },
            { city: { contains: search, mode: "insensitive" } },
            { address: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  };
}

export async function getCrmLeads(input: unknown = {}) {
  await requireAdminPage("/admin/crm/leads");
  const parsed = leadQuerySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Lead filters are invalid." } as const;

  const { cursor, page: requestedPage, limit } = parsed.data;
  const filters = {
    search: parsed.data.search,
    status: parsed.data.status,
    country: parsed.data.country,
    state: parsed.data.state,
  };
  const where = buildLeadWhere(filters);
  const totalCount = await prisma.lead.count({ where });
  const totalPages = Math.ceil(totalCount / limit);
  const page = Math.min(requestedPage, Math.max(1, totalPages));
  const legacyCursor = Boolean(cursor);
  let leads;

  try {
    leads = await prisma.lead.findMany({
      where,
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      take: legacyCursor ? limit + 1 : limit,
      ...(legacyCursor ? { cursor: { id: cursor }, skip: 1 } : { skip: (page - 1) * limit }),
      select: {
        id: true,
        type: true,
        name: true,
        email: true,
        phone: true,
        company: true,
        country: true,
        city: true,
        state: true,
        address: true,
        website: true,
        message: true,
        notes: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  } catch (error) {
    if (legacyCursor && error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return {
        ok: false,
        error: "The lead page cursor is no longer available. Reload the list.",
      } as const;
    }
    throw error;
  }

  const hasMore = legacyCursor && leads.length > limit;
  return {
    ok: true,
    leads: hasMore ? leads.slice(0, limit) : leads,
    totalCount,
    page,
    totalPages,
    nextCursor: hasMore ? (leads[limit - 1]?.id ?? null) : null,
  } as const;
}

type LeadMetricSet = {
  totalCount: number;
  countryDistribution: { country: string; count: number }[];
  statusCounts: Record<(typeof leadStatuses)[number], number>;
  contactCoverage: {
    phoneCount: number;
    phonePercent: number;
    emailCount: number;
    emailPercent: number;
  };
};

async function getLeadMetricSet(where: Prisma.LeadWhereInput): Promise<LeadMetricSet> {
  const [totalCount, statuses, countries, phoneCount, emailCount] = await Promise.all([
    prisma.lead.count({ where }),
    prisma.lead.groupBy({ by: ["status"], where, _count: { _all: true } }),
    prisma.lead.groupBy({ by: ["country"], where, _count: { _all: true } }),
    prisma.lead.count({ where: { AND: [where, { phone: { not: null, notIn: [""] } }] } }),
    prisma.lead.count({ where: { AND: [where, { email: { not: null, notIn: [""] } }] } }),
  ]);

  const statusCounts = Object.fromEntries(leadStatuses.map((status) => [status, 0])) as Record<
    (typeof leadStatuses)[number],
    number
  >;
  for (const group of statuses) statusCounts[group.status] = group._count._all;

  const countriesByName = new Map<string, { country: string; count: number }>();
  for (const group of countries) {
    const country = group.country?.trim() ?? "";
    if (!country) continue;
    const key = country.toLocaleLowerCase();
    const existing = countriesByName.get(key);
    if (existing) existing.count += group._count._all;
    else countriesByName.set(key, { country, count: group._count._all });
  }

  const percentage = (count: number) =>
    totalCount === 0 ? 0 : Math.round((count / totalCount) * 1000) / 10;
  return {
    totalCount,
    countryDistribution: [...countriesByName.values()].sort(
      (first, second) => second.count - first.count || first.country.localeCompare(second.country),
    ),
    statusCounts,
    contactCoverage: {
      phoneCount,
      phonePercent: percentage(phoneCount),
      emailCount,
      emailPercent: percentage(emailCount),
    },
  };
}

export async function getCrmLeadSummaryMetrics(input: unknown = {}) {
  await requireAdminPage("/admin/crm/leads");
  const parsed = leadFiltersSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Lead filters are invalid." } as const;

  const scopedWhere = buildLeadWhere(parsed.data);
  const [global, scoped] = await Promise.all([getLeadMetricSet({}), getLeadMetricSet(scopedWhere)]);
  return { ok: true, global, scoped } as const;
}

export async function updateCrmLeadStatus(input: unknown): Promise<
  | { ok: true; lead: { id: string; status: (typeof leadStatuses)[number] }; changed: boolean }
  | ActionError
> {
  const admin = await requireAdminPage("/admin/crm/leads");
  const parsed = leadStatusUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Lead status is invalid." };
  }

  const { leadId, status } = parsed.data;
  const result = await prisma.$transaction(
    async (transaction) => {
      const existing = await transaction.lead.findUnique({
        where: { id: leadId },
        select: { id: true, status: true },
      });
      if (!existing) return { error: "Lead not found." } as const;
      if (existing.status === status) return { lead: { id: leadId, status }, changed: false } as const;

      const updated = await transaction.lead.updateMany({
        where: { id: leadId, status: existing.status },
        data: { status },
      });
      if (updated.count !== 1) return { error: "Lead status changed concurrently. Reload and retry." } as const;

      await transaction.crmInteraction.create({
        data: {
          type: "OTHER",
          subject: "Lead status changed",
          content: `Status changed from ${existing.status} to ${status}.`,
          authorId: admin.id,
          leadId,
        },
      });
      return { lead: { id: leadId, status }, changed: true } as const;
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );

  if ("error" in result && typeof result.error === "string") {
    return { ok: false, error: result.error };
  }
  revalidatePath("/admin/crm/leads");
  revalidatePath(`/admin/crm/leads/${leadId}`);
  return { ok: true, ...result };
}

export async function bulkUpdateCrmLeadStatus(input: unknown): Promise<
  { ok: true; updatedCount: number } | ActionError
> {
  const admin = await requireAdminPage("/admin/crm/leads");
  const parsed = bulkLeadStatusUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Lead status update is invalid." };
  }

  const leadIds = [...new Set(parsed.data.leadIds)];
  const { status } = parsed.data;
  const result = await prisma.$transaction(
    async (transaction) => {
      const leads = await transaction.lead.findMany({
        where: { id: { in: leadIds } },
        select: { id: true, status: true },
      });
      if (leads.length !== leadIds.length) return { error: "One or more leads were not found." } as const;

      const changedLeads = leads.filter((lead) => lead.status !== status);
      if (changedLeads.length === 0) return { updatedCount: 0 } as const;

      const changedIds = changedLeads.map((lead) => lead.id);
      const updated = await transaction.lead.updateMany({
        where: { id: { in: changedIds } },
        data: { status },
      });
      if (updated.count !== changedIds.length) {
        return { error: "One or more lead statuses changed concurrently. Reload and retry." } as const;
      }

      await transaction.crmInteraction.createMany({
        data: changedLeads.map((lead) => ({
          type: "OTHER" as const,
          subject: "Lead status changed",
          content: `Status changed from ${lead.status} to ${status}.`,
          authorId: admin.id,
          leadId: lead.id,
        })),
      });
      return { updatedCount: changedIds.length } as const;
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );

  if ("error" in result && typeof result.error === "string") {
    return { ok: false, error: result.error };
  }
  revalidatePath("/admin/crm/leads");
  return { ok: true, updatedCount: result.updatedCount };
}

export async function getCrmLeadDetail(leadId: unknown) {
  await requireAdminPage("/admin/crm/leads");
  const parsed = leadIdSchema.safeParse(leadId);
  if (!parsed.success) return { ok: false, error: "Choose a valid lead." } as const;

  const lead = await prisma.lead.findUnique({
    where: { id: parsed.data },
    include: {
      interactions: {
        orderBy: [{ occurredAt: "desc" }, { id: "desc" }],
        take: 50,
        include: { author: { select: { id: true, name: true } } },
      },
    },
  });
  if (!lead) return { ok: false, error: "Lead not found." } as const;
  return { ok: true, lead } as const;
}

export async function getCrmLeadCountries() {
  await requireAdminPage("/admin/crm/leads");
  const leads = await prisma.lead.findMany({
    where: { country: { not: null, notIn: [""] } },
    distinct: ["country"],
    orderBy: { country: "asc" },
    select: { country: true },
  });
  return leads
    .map(({ country }) => country?.trim() ?? "")
    .filter(Boolean)
    .sort((first, second) => first.localeCompare(second));
}

export async function getCrmLeadStates(country?: string) {
  await requireAdminPage("/admin/crm/leads");
  const leads = await prisma.lead.findMany({
    where: {
      state: { not: null, notIn: [""] },
      ...(country ? { country: { equals: country, mode: "insensitive" } } : {}),
    },
    distinct: ["state"],
    orderBy: { state: "asc" },
    select: { state: true },
  });
  return leads
    .map(({ state }) => state?.trim() ?? "")
    .filter(Boolean)
    .sort((first, second) => first.localeCompare(second));
}

export async function getCrmCustomers(input: unknown = {}) {
  await requireAdminPage("/admin/crm/customers");
  const parsed = customerQuerySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Customer filters are invalid." } as const;

  const { search, cursor, limit } = parsed.data;
  const where: Prisma.UserWhereInput = {
    role: "CUSTOMER",
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { firstName: { contains: search, mode: "insensitive" } },
            { lastName: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  let customers;
  try {
    customers = await prisma.user.findMany({
      where,
      orderBy: [{ name: "asc" }, { id: "asc" }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: {
        id: true,
        name: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        _count: { select: { orders: true } },
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return {
        ok: false,
        error: "The customer page cursor is no longer available. Reload the list.",
      } as const;
    }
    throw error;
  }

  const hasMore = customers.length > limit;
  const page = hasMore ? customers.slice(0, limit) : customers;
  return {
    ok: true,
    customers: page,
    nextCursor: hasMore ? (page.at(-1)?.id ?? null) : null,
  } as const;
}

export async function getCrmCustomerProfile(customerId: string) {
  await requireAdminPage("/admin/crm/customers");
  if (typeof customerId !== "string" || !customerId.trim() || customerId.length > 191) {
    return { ok: false, error: "Choose a valid customer." } as const;
  }

  const customer = await prisma.user.findFirst({
    where: { id: customerId.trim(), role: "CUSTOMER" },
    select: {
      id: true,
      name: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      orders: {
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: 20,
        select: {
          id: true,
          email: true,
          totalCents: true,
          currency: true,
          status: true,
          fulfillmentStatus: true,
          createdAt: true,
        },
      },
      crmInteractions: {
        orderBy: [{ occurredAt: "desc" }, { id: "desc" }],
        take: 50,
        select: {
          id: true,
          type: true,
          subject: true,
          content: true,
          occurredAt: true,
          author: { select: { id: true, name: true } },
        },
      },
    },
  });

  if (!customer) return { ok: false, error: "Customer not found." } as const;
  return { ok: true, customer } as const;
}

export async function createCrmInteraction(
  input: unknown,
): Promise<
  { ok: true; interaction: { id: string; type: string; occurredAt: Date } } | ActionError
> {
  const admin = await requireAdminPage("/admin/crm");
  const parsed = interactionSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Interaction details are invalid.",
    };
  }

  const { type, subject, content, occurredAt, customerId, leadId, orderId } = parsed.data;
  const result = await prisma.$transaction(async (transaction) => {
    const [customer, lead, order] = await Promise.all([
      customerId
        ? transaction.user.findFirst({
            where: { id: customerId, role: "CUSTOMER" },
            select: { id: true },
          })
        : null,
      leadId ? transaction.lead.findUnique({ where: { id: leadId }, select: { id: true } }) : null,
      orderId
        ? transaction.order.findUnique({
            where: { id: orderId },
            select: { id: true, userId: true },
          })
        : null,
    ]);

    if (customerId && !customer) return { error: "Customer not found." } as const;
    if (leadId && !lead) return { error: "Lead not found." } as const;
    if (orderId && !order) return { error: "Order not found." } as const;
    if (customerId && order?.userId && order.userId !== customerId) {
      return { error: "The order does not belong to the selected customer." } as const;
    }

    const interaction = await transaction.crmInteraction.create({
      data: {
        type,
        subject: subject || null,
        content,
        ...(occurredAt ? { occurredAt: new Date(occurredAt) } : {}),
        authorId: admin.id,
        customerId: customerId ?? null,
        leadId: leadId ?? null,
        orderId: orderId ?? null,
      },
      select: { id: true, type: true, occurredAt: true },
    });
    return { interaction } as const;
  });

  if ("error" in result) {
    return { ok: false, error: result.error ?? "Unable to create the CRM interaction." };
  }

  revalidatePath("/admin/crm");
  if (customerId) revalidatePath(`/admin/crm/customers/${customerId}`);
  if (leadId) revalidatePath(`/admin/crm/leads/${leadId}`);
  if (orderId) revalidatePath(`/admin/crm/orders/${orderId}`);
  return { ok: true, interaction: result.interaction };
}
