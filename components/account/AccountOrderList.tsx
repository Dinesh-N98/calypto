"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, Copy } from "lucide-react";
import { useCart } from "@/components/CartProvider";

export type AccountOrder = {
  id: string;
  providerReference: string;
  status: string;
  fulfillmentStatus: string | null;
  carrier: string | null;
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
  const [statusOrderId, setStatusOrderId] = useState<string | null>(null);
  const [trackingMessage, setTrackingMessage] = useState("");
  const [isReordering, setIsReordering] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const { addItem } = useCart();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (selectedOrder && !dialog.open) dialog.showModal();
    if (!selectedOrder && dialog.open) dialog.close();
  }, [selectedOrder]);

  async function reorder(order: AccountOrder, showInlineFeedback = false) {
    setIsReordering(true);
    setStatusMessage("");
    setStatusOrderId(showInlineFeedback ? order.id : null);
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

  async function copyTrackingNumber(trackingNumber: string) {
    try {
      await navigator.clipboard.writeText(trackingNumber);
      setTrackingMessage("Tracking number copied.");
    } catch {
      setTrackingMessage("Unable to copy the tracking number. Please select and copy it manually.");
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
      <ul className="divide-y divide-ink/10 border-y border-ink/10">
        {orders.map((order) => (
          <li
            className="py-3 transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 motion-reduce:transform-none motion-reduce:transition-none"
            key={order.id}
          >
            <div className="grid gap-3 border border-ink/10 bg-white/70 p-4 shadow-sm sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:p-5">
              <button
                className="grid min-h-11 w-full gap-3 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-olive sm:grid-cols-[1fr_auto] sm:items-center"
                onClick={() => {
                  setSelectedOrder(order);
                  setStatusMessage("");
                  setStatusOrderId(null);
                  setTrackingMessage("");
                }}
                type="button"
                aria-label={`View order ${order.providerReference}`}
              >
                <span>
                  <span className="block font-bold">{order.providerReference}</span>
                  <span className="mt-1 block text-sm text-[#55584e]">
                    {new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(order.createdAt)}
                    {" · "}{order.items.length} {order.items.length === 1 ? "item" : "items"}
                  </span>
                </span>
                <span className="flex items-center justify-between gap-3 sm:justify-end">
                  <OrderStatus value={order.fulfillmentStatus || order.status} />
                  <strong className="text-sm sm:text-right">
                    {new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: order.currency,
                    }).format(order.totalCents / 100)}
                  </strong>
                  <ArrowRight aria-hidden="true" className="h-4 w-4 text-olive" />
                </span>
              </button>
              <button
                className="inline-flex min-h-11 items-center justify-center border border-ink/20 px-4 text-[.65rem] font-bold uppercase tracking-[.08em] transition-colors hover:border-ink hover:bg-ink hover:text-paper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-olive disabled:opacity-60 motion-reduce:transition-none"
                disabled={isReordering}
                onClick={() => void reorder(order, true)}
                type="button"
              >
                {isReordering && statusOrderId === order.id ? "Adding..." : "Reorder"}
              </button>
              {statusOrderId === order.id && statusMessage && (
                <p className="text-sm text-olive sm:col-span-2" role="status" aria-live="polite" aria-atomic="true">
                  {statusMessage}
                </p>
              )}
            </div>
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
                <p className="text-[.65rem] font-bold uppercase tracking-[.15em] text-olive">
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
                className="grid min-h-11 min-w-11 place-items-center border border-ink/20 text-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-olive"
                onClick={() => dialogRef.current?.close()}
                type="button"
              >
                ×
              </button>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-2">
              <span className="text-sm">Status:</span>
              <OrderStatus value={selectedOrder.fulfillmentStatus || selectedOrder.status} />
            </div>
            <FulfillmentTimeline
              fulfillmentStatus={selectedOrder.fulfillmentStatus}
              orderStatus={selectedOrder.status}
            />
            {(selectedOrder.carrier || selectedOrder.trackingNumber) && (
              <section className="mt-5 border border-ink/10 bg-white/70 p-4" aria-label="Shipment tracking">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-[.65rem] font-bold uppercase tracking-[.15em]">
                    Tracking details
                  </h3>
                  {selectedOrder.carrier && (
                    <span className="inline-flex min-h-7 items-center border border-ink/15 bg-paper px-2.5 text-[.6rem] font-bold uppercase tracking-[.08em]">
                      {selectedOrder.carrier}
                    </span>
                  )}
                </div>
                {selectedOrder.trackingNumber && (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <code className="break-all text-sm font-bold">{selectedOrder.trackingNumber}</code>
                    <button
                      className="inline-flex min-h-11 items-center gap-2 border border-ink/20 px-3 text-[.6rem] font-bold uppercase tracking-[.08em] transition-colors hover:border-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-olive motion-reduce:transition-none"
                      onClick={() => void copyTrackingNumber(selectedOrder.trackingNumber ?? "")}
                      type="button"
                    >
                      {trackingMessage === "Tracking number copied." ? (
                        <Check aria-hidden="true" className="h-4 w-4" />
                      ) : (
                        <Copy aria-hidden="true" className="h-4 w-4" />
                      )}
                      Copy
                    </button>
                  </div>
                )}
                <p className="mt-2 min-h-5 text-sm text-olive" role="status" aria-live="polite" aria-atomic="true">
                  {trackingMessage}
                </p>
              </section>
            )}
            {isSafeTrackingUrl(selectedOrder.trackingUrl) && (
              <a
                className="mt-3 inline-flex min-h-11 items-center text-sm font-bold text-olive underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-olive"
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
                className="min-h-11 bg-ink px-4 text-[.65rem] font-bold uppercase tracking-[.08em] text-paper transition-colors hover:bg-olive disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-olive motion-reduce:transition-none"
                disabled={isReordering}
                onClick={() => void reorder(selectedOrder)}
                type="button"
              >
                {isReordering ? "Adding items..." : "Reorder"}
              </button>
              <a
                className="inline-flex min-h-11 items-center border border-ink/30 px-4 text-[.65rem] font-bold uppercase tracking-[.08em] transition-colors hover:border-ink hover:bg-white/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-olive motion-reduce:transition-none"
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

function OrderStatus({ value }: { value: string }) {
  const normalized = value.toUpperCase();
  const statusStyles: Record<string, string> = {
    PENDING: "border-ink/20 bg-white/60 text-ink",
    PROCESSING: "border-ink/20 bg-paper text-ink",
    SHIPPED: "border-lime bg-lime/20 text-ink",
    DELIVERED: "border-ink bg-ink text-paper",
    CANCELLED: "border-ink/20 bg-white/60 text-muted",
  };

  return (
    <span
      className={`inline-flex min-h-7 shrink-0 items-center border px-2.5 text-[.6rem] font-bold uppercase tracking-[.08em] ${
        statusStyles[normalized] ?? "border-ink/20 bg-white/60 text-ink"
      }`}
    >
      {value}
    </span>
  );
}

function FulfillmentTimeline({
  fulfillmentStatus,
  orderStatus,
}: {
  fulfillmentStatus: string | null;
  orderStatus: string;
}) {
  const normalized = fulfillmentStatus?.toUpperCase();
  const isCancelled = normalized === "CANCELLED" || orderStatus.toLowerCase() === "cancelled";
  const currentStep =
    normalized === "DELIVERED"
      ? 3
      : normalized === "SHIPPED"
        ? 2
        : normalized === "PROCESSING" || (!normalized && orderStatus.toLowerCase() === "paid")
          ? 1
          : 0;
  const steps = ["Order placed", "Processing", "Shipped", "Delivered"];

  return (
    <section className="mt-6" aria-label="Fulfillment progress">
      <h3 className="text-[.65rem] font-bold uppercase tracking-[.15em]">Fulfillment progress</h3>
      {isCancelled ? (
        <p className="mt-3 border-l-2 border-ink/30 py-1 pl-3 text-sm text-[#55584e]">
          This order was cancelled.
        </p>
      ) : (
        <ol className="mt-4 grid grid-cols-4 gap-1" aria-label={`Current step: ${steps[currentStep]}`}>
          {steps.map((step, index) => {
            const isComplete = index < currentStep;
            const isCurrent = index === currentStep;
            return (
              <li className="relative min-w-0 text-center" key={step}>
                <span
                  aria-hidden="true"
                  className={`mx-auto grid h-5 w-5 place-items-center border text-[.6rem] font-bold ${
                    isComplete
                      ? "border-lime bg-lime text-ink"
                      : isCurrent
                        ? "border-ink bg-ink text-paper"
                        : "border-ink/20 bg-white/60 text-muted"
                  }`}
                >
                  {isComplete ? <Check className="h-3 w-3" /> : index + 1}
                </span>
                <span
                  aria-current={isCurrent ? "step" : undefined}
                  className={`mt-2 block text-[.55rem] font-bold uppercase leading-4 tracking-[.04em] sm:text-[.6rem] ${
                    isCurrent || isComplete ? "text-ink" : "text-[#77796e]"
                  }`}
                >
                  {step}
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </section>
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
