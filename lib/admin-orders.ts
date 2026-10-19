import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const ADMIN_ORDER_STATUSES = [
  "PENDING",
  "PAID",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "REFUNDED",
] as const;

export type AdminOrderStatus = (typeof ADMIN_ORDER_STATUSES)[number];
export type AdminOrderSort = "date" | "total";
export type AdminOrderPageSize = 10 | 25 | 50;

export type AdminOrdersQuery = {
  search?: string;
  status?: AdminOrderStatus;
  from?: Date;
  to?: Date;
  page: number;
  pageSize: AdminOrderPageSize;
  sort: AdminOrderSort;
  direction: "asc" | "desc";
};

export type AdminOrdersResult = {
  orders: {
    id: string;
    providerReference: string;
    email: string;
    customerFirstName: string | null;
    customerLastName: string | null;
    user: { name: string | null } | null;
    status: string;
    fulfillmentStatus: string | null;
    carrier: string | null;
    trackingNumber: string | null;
    trackingUrl: string | null;
    paymentProvider: string;
    createdAt: Date;
    totalCents: number;
    currency: string;
  }[];
  totalOrders: number;
  totalPages: number;
  page: number;
  pageSize: AdminOrderPageSize;
  summary: {
    totalOrders: number;
    pendingOrders: number;
    shippedOrders: number;
    unfulfilledOrders: number;
    revenueByCurrency: { currency: string; totalCents: number }[];
  };
};

function buildOrdersWhere(query: AdminOrdersQuery): Prisma.OrderWhereInput {
  const conditions: Prisma.OrderWhereInput[] = [];
  const search = query.search?.trim();

  if (search) {
    conditions.push({
      OR: [
        { id: { contains: search, mode: "insensitive" } },
        { providerReference: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { customerFirstName: { contains: search, mode: "insensitive" } },
        { customerLastName: { contains: search, mode: "insensitive" } },
        { user: { is: { name: { contains: search, mode: "insensitive" } } } },
      ],
    });
  }

  if (query.status) {
    const status = query.status;
    conditions.push(
      status === "SHIPPED" || status === "DELIVERED"
        ? { fulfillmentStatus: status }
        : status === "CANCELLED"
          ? {
              OR: [
                { status: "cancelled" },
                { fulfillmentStatus: "CANCELLED" },
              ],
            }
          : { status: status.toLowerCase() },
    );
  }

  if (query.from || query.to) {
    conditions.push({
      createdAt: {
        ...(query.from ? { gte: query.from } : {}),
        ...(query.to ? { lt: query.to } : {}),
      },
    });
  }

  return conditions.length ? { AND: conditions } : {};
}

export async function getAdminOrders(query: AdminOrdersQuery): Promise<AdminOrdersResult> {
  const where = buildOrdersWhere(query);
  const [totalOrders, allOrdersCount, pendingOrders, shippedOrders, unfulfilledOrders, revenue] =
    await Promise.all([
      prisma.order.count({ where }),
      prisma.order.count(),
      prisma.order.count({ where: { status: "pending" } }),
      prisma.order.count({
        where: { fulfillmentStatus: { in: ["SHIPPED", "DELIVERED"] } },
      }),
      prisma.order.count({
        where: {
          status: "paid",
          OR: [{ fulfillmentStatus: null }, { fulfillmentStatus: "PROCESSING" }],
        },
      }),
      prisma.order.groupBy({
        by: ["currency"],
        where: { status: "paid" },
        _sum: { totalCents: true },
      }),
    ]);

  const totalPages = Math.max(1, Math.ceil(totalOrders / query.pageSize));
  const page = Math.min(query.page, totalPages);
  const orders = await prisma.order.findMany({
    where,
    orderBy:
      query.sort === "total"
        ? [
            { totalCents: query.direction },
            { createdAt: "desc" },
            { id: "desc" },
          ]
        : [{ createdAt: query.direction }, { id: query.direction }],
    skip: (page - 1) * query.pageSize,
    take: query.pageSize,
    select: {
      id: true,
      providerReference: true,
      email: true,
      customerFirstName: true,
      customerLastName: true,
      user: { select: { name: true } },
      status: true,
      fulfillmentStatus: true,
      carrier: true,
      trackingNumber: true,
      trackingUrl: true,
      paymentProvider: true,
      createdAt: true,
      totalCents: true,
      currency: true,
    },
  });

  return {
    orders,
    totalOrders,
    totalPages,
    page,
    pageSize: query.pageSize,
    summary: {
      totalOrders: allOrdersCount,
      pendingOrders,
      shippedOrders,
      unfulfilledOrders,
      revenueByCurrency: revenue.map(({ currency, _sum }) => ({
        currency,
        totalCents: _sum.totalCents ?? 0,
      })),
    },
  };
}
