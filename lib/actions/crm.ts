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
    cursor: z.string().trim().min(1).max(191).optional(),
    limit: z.number().int().min(1).max(50).default(25),
  })
  .strict();

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

export async function getCrmLeads(input: unknown = {}) {
  await requireAdminPage("/admin/crm/leads");
  const parsed = leadQuerySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Lead filters are invalid." } as const;

  const { search, status, country, cursor, limit } = parsed.data;
  const where: Prisma.LeadWhereInput = {
    ...(status ? { status } : {}),
    ...(country ? { country: { equals: country, mode: "insensitive" } } : {}),
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

  let leads;
  try {
    leads = await prisma.lead.findMany({
      where,
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
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
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return {
        ok: false,
        error: "The lead page cursor is no longer available. Reload the list.",
      } as const;
    }
    throw error;
  }

  const hasMore = leads.length > limit;
  const page = hasMore ? leads.slice(0, limit) : leads;
  return { ok: true, leads: page, nextCursor: hasMore ? (page.at(-1)?.id ?? null) : null } as const;
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
