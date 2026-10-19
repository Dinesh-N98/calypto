"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import type { AdminOrdersResult } from "@/lib/admin-orders";
import { OrderDetailsSheet } from "@/components/admin/orders/OrderDetailsSheet";
import { OrderStatusBadge } from "@/components/admin/orders/OrderStatusBadge";

type OrderRow = AdminOrdersResult["orders"][number];

function formatCurrency(amountCents: number, currency: string): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amountCents / 100);
}

export function OrdersDataTable({
  orders,
  page,
  pageSize,
  totalOrders,
  totalPages,
  sort,
  direction,
}: {
  orders: OrderRow[];
  page: number;
  pageSize: number;
  totalOrders: number;
  totalPages: number;
  sort: "date" | "total";
  direction: "asc" | "desc";
}) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  function hrefWith(updates: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  }

  function sortHref(column: "date" | "total") {
    const nextDirection = sort === column && direction === "desc" ? "asc" : "desc";
    return hrefWith({ sort: column, direction: nextDirection, page: "1" });
  }

  return (
    <>
      <section className="overflow-hidden rounded-xl border border-black/10 bg-white shadow-sm">
        {totalOrders === 0 ? (
          <div className="px-5 py-14 text-center">
            <h2 className="font-bold">No orders found</h2>
            <p className="mt-2 text-sm text-[#65695f]">
              Try adjusting the search or filters to see matching orders.
            </p>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/10 px-4 py-3">
              <p className="text-sm text-[#65695f]">
                Showing{" "}
                <span className="font-bold text-[#171a14]">
                  {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, totalOrders)}
                </span>{" "}
                of <span className="font-bold text-[#171a14]">{totalOrders}</span> orders
              </p>
              <p className="text-xs text-[#65695f]">Select an order to view details or fulfillment.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] border-collapse text-left text-sm">
                <thead className="bg-[#f5f6f2] text-[.68rem] uppercase tracking-[.08em] text-[#55594f]">
                  <tr>
                    <th className="px-4 py-3">Order</th>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">
                      <Link className="inline-flex min-h-8 items-center hover:text-[#718126]" href={sortHref("date")}>
                        Date {sort === "date" ? (direction === "asc" ? "↑" : "↓") : "↕"}
                      </Link>
                    </th>
                    <th className="px-4 py-3">Payment</th>
                    <th className="px-4 py-3">Fulfillment</th>
                    <th className="px-4 py-3 text-right">
                      <Link className="inline-flex min-h-8 items-center hover:text-[#718126]" href={sortHref("total")}>
                        Total {sort === "total" ? (direction === "asc" ? "↑" : "↓") : "↕"}
                      </Link>
                    </th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/10">
                  {orders.map((order) => {
                    const name =
                      [order.customerFirstName, order.customerLastName].filter(Boolean).join(" ") ||
                      order.user?.name ||
                      "Guest customer";
                    return (
                      <tr className="transition-colors hover:bg-[#fafbf8]" key={order.id}>
                        <td className="px-4 py-4">
                          <button
                            className="font-bold text-[#171a14] hover:text-[#718126] hover:underline"
                            onClick={() => setSelectedOrderId(order.id)}
                            type="button"
                          >
                            {order.providerReference}
                          </button>
                          <p className="mt-1 max-w-44 truncate text-xs text-[#777b70]">{order.id}</p>
                        </td>
                        <td className="px-4 py-4">
                          <p className="font-semibold">{name}</p>
                          <p className="mt-1 text-xs text-[#65695f]">{order.email}</p>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-[#55594f]">
                          {new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(
                            order.createdAt,
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <OrderStatusBadge kind="payment" status={order.status} />
                        </td>
                        <td className="px-4 py-4">
                          <OrderStatusBadge kind="fulfillment" status={order.fulfillmentStatus} />
                          {order.trackingNumber && (
                            <p className="mt-1 max-w-36 truncate text-xs text-[#65695f]">
                              {order.carrier} · {order.trackingNumber}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-4 text-right font-bold whitespace-nowrap">
                          {formatCurrency(order.totalCents, order.currency)}
                        </td>
                        <td className="px-4 py-4 text-right">
                          <details className="relative inline-block text-left">
                            <summary
                              aria-label={`Actions for order ${order.providerReference}`}
                              className="grid min-h-10 min-w-10 cursor-pointer list-none place-items-center rounded-lg border border-black/15 text-lg hover:bg-stone-50 [&::-webkit-details-marker]:hidden"
                            >
                              ⋯
                            </summary>
                            <div className="absolute right-0 z-20 mt-1 grid min-w-44 overflow-hidden rounded-lg border border-black/10 bg-white py-1 text-left shadow-xl">
                              <button
                                className="px-3 py-2 text-left text-sm hover:bg-stone-50"
                                onClick={() => setSelectedOrderId(order.id)}
                                type="button"
                              >
                                View details / update status
                              </button>
                              <a
                                className="px-3 py-2 text-sm hover:bg-stone-50"
                                href={`/api/admin/orders/${encodeURIComponent(order.id)}/invoice`}
                              >
                                Download invoice
                              </a>
                            </div>
                          </details>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {totalOrders > 0 && (
          <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-black/10 px-4 py-3">
            <p aria-live="polite" className="text-sm text-[#65695f]">
              Page {page} of {totalPages}
            </p>
            <nav aria-label="Order pages" className="flex gap-2">
              {page > 1 ? (
                <Link
                  className="inline-flex min-h-10 items-center rounded-lg border border-black/15 px-3 text-sm font-semibold hover:bg-stone-50"
                  href={hrefWith({ page: String(page - 1) })}
                >
                  Previous
                </Link>
              ) : (
                <span className="inline-flex min-h-10 items-center rounded-lg border border-black/10 px-3 text-sm text-stone-400">
                  Previous
                </span>
              )}
              {page < totalPages ? (
                <Link
                  className="inline-flex min-h-10 items-center rounded-lg border border-black/15 px-3 text-sm font-semibold hover:bg-stone-50"
                  href={hrefWith({ page: String(page + 1) })}
                >
                  Next
                </Link>
              ) : (
                <span className="inline-flex min-h-10 items-center rounded-lg border border-black/10 px-3 text-sm text-stone-400">
                  Next
                </span>
              )}
            </nav>
          </footer>
        )}
      </section>
      <OrderDetailsSheet
        onClose={() => setSelectedOrderId(null)}
        orderId={selectedOrderId}
      />
    </>
  );
}
