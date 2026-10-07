"use client";

import { useEffect, useRef, useState } from "react";
import { useCart } from "@/components/CartProvider";

export type AccountOrder = {
  id: string;
  providerReference: string;
  status: string;
  fulfillmentStatus: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  createdAt: Date;
  totalCents: number;
  currency: string;
  items: { id: string; name: string; productSlug: string; priceCents: number; quantity: number }[];
};

type ReorderResponse = {
  items: { slug: string; name: string; priceCents: number; imageUrl: string; quantity: number }[];
  unavailable: string[];
};

export function AccountOrderList({ orders }: { orders: AccountOrder[] }) {
  const [selectedOrder, setSelectedOrder] = useState<AccountOrder | null>(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [isReordering, setIsReordering] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const { addItem } = useCart();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (selectedOrder && !dialog.open) dialog.showModal();
    if (!selectedOrder && dialog.open) dialog.close();
  }, [selectedOrder]);

  async function reorder(order: AccountOrder) {
    setIsReordering(true);
    setStatusMessage("");
    try {
      const response = await fetch(`/api/account/orders/${encodeURIComponent(order.id)}/reorder`, {
        method: "POST",
      });
      const result = (await response.json()) as ReorderResponse | { error?: string };
      if (!response.ok || !("items" in result)) {
        throw new Error(
          ("error" in result && result.error) || "Unable to reorder this order.",
        );
      }
      result.items.forEach((item) => addItem(item, item.quantity));
      const addedCount = result.items.length;
      setStatusMessage(
        result.unavailable.length > 0
          ? `${addedCount} ${addedCount === 1 ? "item was" : "items were"} added. Unavailable: ${result.unavailable.join(", ")}.`
          : `${addedCount} ${addedCount === 1 ? "item was" : "items were"} added to your cart.`,
      );
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Unable to reorder this order.");
    } finally {
      setIsReordering(false);
    }
  }

  if (orders.length === 0) {
    return (
      <div className="border-y border-ink/15 py-10">
        <h2 className="text-xl font-black uppercase">No orders yet.</h2>
        <p className="mt-2 text-sm text-[#55584e]">Your order history will appear here.</p>
      </div>
    );
  }

  return (
    <>
      <ul className="divide-y divide-ink/15 border-y border-ink/15">
        {orders.map((order) => (
          <li className="py-5" key={order.id}>
            <button
              className="grid w-full gap-3 text-left sm:grid-cols-[1fr_auto] sm:items-center focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#65771b]"
              onClick={() => {
                setSelectedOrder(order);
                setStatusMessage("");
              }}
              type="button"
              aria-label={`View order ${order.providerReference}`}
            >
              <span>
                <span className="block font-bold">{order.providerReference}</span>
                <span className="mt-1 block text-sm text-[#55584e]">
                  {new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(order.createdAt)}
                  {" · "}{order.items.length} {order.items.length === 1 ? "item" : "items"}
                  {" · "}{order.fulfillmentStatus || order.status}
                </span>
              </span>
              <strong className="sm:text-right">
                {new Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: order.currency,
                }).format(order.totalCents / 100)}
              </strong>
            </button>
          </li>
        ))}
      </ul>

      <dialog
        aria-labelledby="order-detail-title"
        className="m-auto max-h-[90vh] w-[min(42rem,calc(100%-2rem))] max-w-none overflow-y-auto border-0 bg-paper p-0 text-ink shadow-2xl backdrop:bg-ink/65"
        onClose={() => setSelectedOrder(null)}
        onClick={(event) => {
          if (event.target === event.currentTarget) dialogRef.current?.close();
        }}
        ref={dialogRef}
      >
        {selectedOrder && (
          <section className="p-5 sm:p-8">
            <div className="flex items-start justify-between gap-4 border-b border-ink/15 pb-5">
              <div>
                <p className="text-[.65rem] font-bold uppercase tracking-[.15em] text-[#65771b]">
                  Order details
                </p>
                <h2 className="mt-2 text-2xl font-black uppercase" id="order-detail-title">
                  {selectedOrder.providerReference}
                </h2>
                <p className="mt-1 text-sm text-[#55584e]">
                  {new Intl.DateTimeFormat("en-US", { dateStyle: "long" }).format(
                    selectedOrder.createdAt,
                  )}
                </p>
              </div>
              <button
                aria-label="Close order details"
                className="grid min-h-11 min-w-11 place-items-center border border-ink/20 text-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#65771b]"
                onClick={() => dialogRef.current?.close()}
                type="button"
              >
                ×
              </button>
            </div>

            <p className="mt-5 text-sm">
              Status: <strong>{selectedOrder.fulfillmentStatus || selectedOrder.status}</strong>
            </p>
            {selectedOrder.trackingNumber && (
              <p className="mt-2 text-sm">Tracking number: {selectedOrder.trackingNumber}</p>
            )}
            {isSafeTrackingUrl(selectedOrder.trackingUrl) && (
              <a
                className="mt-2 inline-block text-sm font-bold text-[#65771b] underline underline-offset-4 focus-visible:outline-2"
                href={selectedOrder.trackingUrl}
                rel="noreferrer"
                target="_blank"
              >
                Open carrier tracking
              </a>
            )}

            <h3 className="mt-6 text-[.65rem] font-bold uppercase tracking-[.15em]">Items</h3>
            <ul className="mt-2 divide-y divide-ink/15 border-y border-ink/15">
              {selectedOrder.items.map((item) => (
                <li className="flex justify-between gap-4 py-3 text-sm" key={item.id}>
                  <span>
                    {item.name} <span className="text-[#55584e]">× {item.quantity}</span>
                  </span>
                  <strong>
                    {new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: selectedOrder.currency,
                    }).format((item.priceCents * item.quantity) / 100)}
                  </strong>
                </li>
              ))}
            </ul>
            <p className="mt-4 flex justify-between gap-4 text-sm font-bold">
              <span>Order total</span>
              <span>
                {new Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: selectedOrder.currency,
                }).format(selectedOrder.totalCents / 100)}
              </span>
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                className="min-h-11 bg-ink px-4 text-[.65rem] font-bold uppercase tracking-[.08em] text-paper disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#65771b]"
                disabled={isReordering}
                onClick={() => void reorder(selectedOrder)}
                type="button"
              >
                {isReordering ? "Adding items..." : "Reorder"}
              </button>
              <a
                className="inline-flex min-h-11 items-center border border-ink/30 px-4 text-[.65rem] font-bold uppercase tracking-[.08em] hover:border-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#65771b]"
                href={`/api/account/orders/${encodeURIComponent(selectedOrder.id)}/invoice`}
              >
                Download invoice
              </a>
            </div>
            {statusMessage && (
              <p className="mt-4 text-sm text-[#55584e]" role="status" aria-live="polite">
                {statusMessage}
              </p>
            )}
          </section>
        )}
      </dialog>
    </>
  );
}

function isSafeTrackingUrl(value: string | null): value is string {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}
