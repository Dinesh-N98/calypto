"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ADMIN_ORDER_STATUSES, type AdminOrderStatus } from "@/lib/admin-orders";

const statusLabels: Record<AdminOrderStatus, string> = {
  PENDING: "Pending payment",
  PAID: "Paid",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  REFUNDED: "Refunded",
};

export function OrdersFilterBar({
  search,
  status,
  from,
  to,
  pageSize,
}: {
  search: string;
  status: AdminOrderStatus | undefined;
  from: string;
  to: string;
  pageSize: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [searchValue, setSearchValue] = useState(search);

  const updateParam = useCallback((key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    params.delete("page");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [pathname, router, searchParams]);

  useEffect(() => {
    if (searchValue === search) return;
    const timeout = window.setTimeout(() => updateParam("search", searchValue.trim()), 300);
    return () => window.clearTimeout(timeout);
  }, [searchValue, search, updateParam]);

  return (
    <section
      aria-label="Filter orders"
      className="grid gap-3 rounded-xl border border-black/10 bg-white p-4 shadow-sm sm:grid-cols-2 xl:grid-cols-[minmax(14rem,1.5fr)_minmax(10rem,1fr)_minmax(9rem,1fr)_minmax(9rem,1fr)_auto]"
    >
      <label className="grid gap-1.5 text-xs font-semibold text-[#55594f] sm:col-span-2 xl:col-span-1">
        Search orders
        <input
          aria-label="Search by order ID or customer"
          autoComplete="off"
          className="min-h-11 rounded-lg border border-black/15 bg-white px-3 text-sm font-normal text-[#171a14] outline-none transition focus:border-[#718126] focus:ring-2 focus:ring-[#718126]/20"
          maxLength={100}
          onChange={(event) => setSearchValue(event.target.value)}
          placeholder="Order ID, customer, or email"
          type="search"
          value={searchValue}
        />
      </label>
      <label className="grid gap-1.5 text-xs font-semibold text-[#55594f]">
        Status
        <select
          className="min-h-11 rounded-lg border border-black/15 bg-white px-3 text-sm font-normal text-[#171a14] outline-none focus:border-[#718126] focus:ring-2 focus:ring-[#718126]/20"
          onChange={(event) => updateParam("status", event.target.value)}
          value={status ?? ""}
        >
          <option value="">All statuses</option>
          {ADMIN_ORDER_STATUSES.map((value) => (
            <option key={value} value={value}>
              {statusLabels[value]}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1.5 text-xs font-semibold text-[#55594f]">
        From
        <input
          className="min-h-11 rounded-lg border border-black/15 bg-white px-3 text-sm font-normal text-[#171a14] outline-none focus:border-[#718126] focus:ring-2 focus:ring-[#718126]/20"
          onChange={(event) => updateParam("from", event.target.value)}
          type="date"
          value={from}
        />
      </label>
      <label className="grid gap-1.5 text-xs font-semibold text-[#55594f]">
        To
        <input
          className="min-h-11 rounded-lg border border-black/15 bg-white px-3 text-sm font-normal text-[#171a14] outline-none focus:border-[#718126] focus:ring-2 focus:ring-[#718126]/20"
          onChange={(event) => updateParam("to", event.target.value)}
          type="date"
          value={to}
        />
      </label>
      <label className="grid gap-1.5 text-xs font-semibold text-[#55594f]">
        Rows
        <select
          className="min-h-11 rounded-lg border border-black/15 bg-white px-3 text-sm font-normal text-[#171a14] outline-none focus:border-[#718126] focus:ring-2 focus:ring-[#718126]/20"
          onChange={(event) => updateParam("pageSize", event.target.value)}
          value={pageSize}
        >
          {[10, 25, 50].map((size) => (
            <option key={size} value={size}>
              {size} per page
            </option>
          ))}
        </select>
      </label>
    </section>
  );
}
