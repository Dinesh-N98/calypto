import { OrdersDataTable } from "@/components/admin/orders/OrdersDataTable";
import { OrdersFilterBar } from "@/components/admin/orders/OrdersFilterBar";
import { OrdersSummaryCards } from "@/components/admin/orders/OrdersSummaryCards";
import {
  ADMIN_ORDER_STATUSES,
  getAdminOrders,
  type AdminOrderPageSize,
  type AdminOrderSort,
  type AdminOrderStatus,
} from "@/lib/admin-orders";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function parsePage(value: string | undefined): number {
  const page = Number(value);
  return Number.isSafeInteger(page) && page > 0 ? page : 1;
}

function parsePageSize(value: string | undefined): AdminOrderPageSize {
  if (value === "25") return 25;
  if (value === "50") return 50;
  return 10;
}

function parseDate(value: string | undefined): Date | undefined {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value
    ? undefined
    : date;
}

function isAdminOrderStatus(value: string | undefined): value is AdminOrderStatus {
  return ADMIN_ORDER_STATUSES.some((status) => status === value);
}

export default async function AdminOrdersPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const search = (firstValue(params.search) ?? "").slice(0, 100);
  const statusValue = firstValue(params.status);
  const fromDateValue = firstValue(params.from);
  const toDateValue = firstValue(params.to);
  const from = parseDate(fromDateValue);
  const toDate = parseDate(toDateValue);
  const to = toDate ? new Date(toDate.getTime() + 24 * 60 * 60 * 1000) : undefined;
  const pageSize = parsePageSize(firstValue(params.pageSize));
  const requestedSort = firstValue(params.sort);
  const sort: AdminOrderSort = requestedSort === "total" ? "total" : "date";
  const direction = firstValue(params.direction) === "asc" ? "asc" : "desc";
  const results = await getAdminOrders({
    search,
    status: isAdminOrderStatus(statusValue) ? statusValue : undefined,
    from,
    to,
    page: parsePage(firstValue(params.page)),
    pageSize,
    sort,
    direction,
  });

  return (
    <section aria-labelledby="admin-orders-title" className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.14em] text-[#718126]">Workspace</p>
          <h1 className="mt-2 text-3xl font-black tracking-[-.04em]" id="admin-orders-title">
            Orders
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#65695f]">
            Search orders, review payment and fulfillment progress, and manage shipments.
          </p>
        </div>
      </header>

      <OrdersSummaryCards summary={results.summary} />
      <OrdersFilterBar
        from={fromDateValue && parseDate(fromDateValue) ? fromDateValue : ""}
        key={search}
        pageSize={pageSize}
        search={search}
        status={isAdminOrderStatus(statusValue) ? statusValue : undefined}
        to={toDateValue && parseDate(toDateValue) ? toDateValue : ""}
      />
      <OrdersDataTable
        direction={direction}
        orders={results.orders}
        page={results.page}
        pageSize={results.pageSize}
        sort={sort}
        totalOrders={results.totalOrders}
        totalPages={results.totalPages}
      />
    </section>
  );
}
