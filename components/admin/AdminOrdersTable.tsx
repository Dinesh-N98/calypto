"use client";

import { useState } from "react";
import {
  AdminFulfillmentModal,
  type AdminOrderFulfillment,
} from "@/components/admin/AdminFulfillmentModal";

type AdminOrder = AdminOrderFulfillment & {
  email: string;
  status: string;
  createdAt: Date;
  totalCents: number;
  currency: string;
};

export function AdminOrdersTable({ orders }: { orders: AdminOrder[] }) {
  const [selectedOrder, setSelectedOrder] = useState<AdminOrderFulfillment | null>(null);

  return (
    <section aria-labelledby="admin-orders-title" className="space-y-6">
      <header>
        <p className="text-xs font-bold uppercase tracking-[.14em] text-[#718126]">Workspace</p>
        <h1 className="mt-2 text-3xl font-black tracking-[-.04em]" id="admin-orders-title">
          Orders
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[#65695f]">
          Review recent orders and add carrier tracking details for fulfillment.
        </p>
      </header>

      {orders.length === 0 ? (
        <div className="rounded-lg border border-black/10 bg-white p-6 text-sm text-[#65695f]">
          No orders have been placed yet.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-black/10 bg-white shadow-sm">
          <table className="w-full min-w-[760px] border-collapse text-left text-sm">
            <thead className="bg-[#f4f5f1] text-xs uppercase tracking-[.08em] text-[#55594f]">
              <tr>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Date / total</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Tracking</th>
                <th className="px-4 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/10">
              {orders.map((order) => (
                <tr key={order.id}>
                  <td className="px-4 py-4 font-bold">{order.providerReference}</td>
                  <td className="px-4 py-4">{order.email}</td>
                  <td className="px-4 py-4">
                    <span className="block">
                      {new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(
                        order.createdAt,
                      )}
                    </span>
                    <span className="mt-1 block text-xs text-[#65695f]">
                      {new Intl.NumberFormat("en-US", {
                        style: "currency",
                        currency: order.currency,
                      }).format(order.totalCents / 100)}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <span className="block">{order.status}</span>
                    {order.fulfillmentStatus && (
                      <span className="mt-1 block text-xs text-[#65695f]">
                        {order.fulfillmentStatus}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    {order.trackingNumber ? (
                      <>
                        <span className="block">{order.carrier}</span>
                        <span className="mt-1 block text-xs text-[#65695f]">
                          {order.trackingNumber}
                        </span>
                      </>
                    ) : (
                      <span className="text-[#65695f]">Not added</span>
                    )}
                  </td>
                  <td className="px-4 py-4 text-right">
                    <button
                      className="min-h-10 border border-black/20 px-3 text-xs font-bold uppercase tracking-[.06em] hover:border-[#718126] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#718126]"
                      onClick={() => setSelectedOrder(order)}
                      type="button"
                    >
                      {order.trackingNumber ? "Edit tracking" : "Add tracking"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AdminFulfillmentModal onClose={() => setSelectedOrder(null)} order={selectedOrder} />
    </section>
  );
}
