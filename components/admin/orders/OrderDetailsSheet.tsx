"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AdminFulfillmentModal } from "@/components/admin/AdminFulfillmentModal";
import type { AdminOrderFulfillment } from "@/components/admin/AdminFulfillmentModal";
import { OrderStatusBadge } from "@/components/admin/orders/OrderStatusBadge";
import { useToast } from "@/components/ToastProvider";

type OrderDetails = AdminOrderFulfillment & {
  email: string;
  customerFirstName: string | null;
  customerLastName: string | null;
  customerPhone: string | null;
  user: { name: string | null } | null;
  status: string;
  paymentProvider: string;
  createdAt: string;
  totalCents: number;
  currency: string;
  shippingName: string | null;
  shippingLine1: string | null;
  shippingLine2: string | null;
  shippingCity: string | null;
  shippingState: string | null;
  shippingPostalCode: string | null;
  shippingCountry: string | null;
  dhlTrackingNumber: string | null;
  dhlShipmentIdentificationNumber: string | null;
  shippingLabelUrl: string | null;
  commercialInvoiceUrl: string | null;
  dhlPickupConfirmationNumber: string | null;
  items: { id: string; name: string; quantity: number; priceCents: number; sku: string | null }[];
};

const fulfillmentStatuses = ["PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"] as const;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isOrderDetails(value: unknown): value is OrderDetails {
  return (
    isObject(value) &&
    typeof value.id === "string" &&
    typeof value.providerReference === "string" &&
    typeof value.email === "string" &&
    typeof value.status === "string" &&
    typeof value.paymentProvider === "string" &&
    typeof value.createdAt === "string" &&
    typeof value.totalCents === "number" &&
    typeof value.currency === "string" &&
    Array.isArray(value.items) &&
    value.items.every(
      (item: unknown) =>
        isObject(item) &&
        typeof item.id === "string" &&
        typeof item.name === "string" &&
        typeof item.quantity === "number" &&
        typeof item.priceCents === "number",
    )
  );
}

function formatCurrency(amountCents: number, currency: string): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amountCents / 100);
}

export function OrderDetailsSheet({
  orderId,
  onClose,
}: {
  orderId: string | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [orderResult, setOrderResult] = useState<{
    id: string;
    order: OrderDetails | null;
    error: string;
  } | null>(null);
  const [trackingOrder, setTrackingOrder] = useState<AdminOrderFulfillment | null>(null);
  const [updatingStatus, startStatusUpdate] = useTransition();
  const [creatingShipment, setCreatingShipment] = useState(false);
  const [schedulingPickup, setSchedulingPickup] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const hasCurrentResult = orderResult?.id === orderId;
  const order = hasCurrentResult ? orderResult.order : null;
  const loading = Boolean(orderId && !hasCurrentResult);
  const error = hasCurrentResult ? orderResult.error : "";

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (orderId && !dialog.open) dialog.showModal();
    if (!orderId && dialog.open) dialog.close();
  }, [orderId]);

  useEffect(() => {
    if (!orderId) return;

    const controller = new AbortController();
    fetch(`/api/admin/orders/${encodeURIComponent(orderId)}`, {
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (response) => {
        const result: unknown = await response.json().catch(() => null);
        if (!response.ok) {
          const message =
            result &&
            typeof result === "object" &&
            "error" in result &&
            typeof result.error === "string"
              ? result.error
              : "Unable to load order details.";
          throw new Error(message);
        }
        if (!isObject(result) || !isOrderDetails(result.order)) {
          throw new Error("Order details response was invalid.");
        }
        setOrderResult({ id: orderId, order: result.order, error: "" });
      })
      .catch((loadError: unknown) => {
        if (loadError instanceof Error && loadError.name === "AbortError") return;
        setOrderResult({
          id: orderId,
          order: null,
          error:
            loadError instanceof Error ? loadError.message : "Unable to load order details.",
        });
      });

    return () => controller.abort();
  }, [orderId]);

  async function createDhlShipment() {
    if (!order) return;
    setCreatingShipment(true);
    try {
      const response = await fetch(`/api/admin/orders/${encodeURIComponent(order.id)}/shipment`, {
        method: "POST",
      });
      const result: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(
          isObject(result) && typeof result.error === "string"
            ? result.error
            : "Unable to generate the DHL shipment.",
        );
      }

      if (!isObject(result) || typeof result.dhlTrackingNumber !== "string") {
        throw new Error("DHL returned an invalid shipment response.");
      }
      const dhlTrackingNumber = result.dhlTrackingNumber;
      setOrderResult((current) =>
        current?.id === order.id && current.order
          ? {
              ...current,
              order: {
                ...current.order,
                dhlTrackingNumber,
                dhlShipmentIdentificationNumber:
                  typeof result.dhlShipmentIdentificationNumber === "string"
                    ? result.dhlShipmentIdentificationNumber
                    : null,
                shippingLabelUrl:
                  typeof result.shippingLabelUrl === "string" ? result.shippingLabelUrl : null,
                commercialInvoiceUrl:
                  typeof result.commercialInvoiceUrl === "string"
                    ? result.commercialInvoiceUrl
                    : null,
                trackingNumber: dhlTrackingNumber,
                carrier: "DHL",
              },
            }
          : current,
      );
      showToast("DHL waybill and shipping label generated.");
    } catch (shipmentError) {
      showToast(
        shipmentError instanceof Error
          ? shipmentError.message
          : "Unable to generate the DHL shipment.",
        "error",
      );
    } finally {
      setCreatingShipment(false);
    }
  }

  async function scheduleDhlPickup() {
    if (!order) return;
    setSchedulingPickup(true);
    try {
      const response = await fetch(`/api/admin/orders/${encodeURIComponent(order.id)}/pickup`, {
        method: "POST",
      });
      const result: unknown = await response.json().catch(() => null);
      if (!response.ok || !isObject(result) || typeof result.confirmationNumber !== "string") {
        throw new Error(
          isObject(result) && typeof result.error === "string"
            ? result.error
            : "Unable to schedule the DHL pickup.",
        );
      }
      const confirmationNumber = result.confirmationNumber;
      setOrderResult((current) =>
        current?.id === order.id && current.order
          ? {
              ...current,
              order: { ...current.order, dhlPickupConfirmationNumber: confirmationNumber },
            }
          : current,
      );
      showToast("DHL pickup scheduled.");
    } catch (pickupError) {
      showToast(
        pickupError instanceof Error ? pickupError.message : "Unable to schedule the DHL pickup.",
        "error",
      );
    } finally {
      setSchedulingPickup(false);
    }
  }

  function updateFulfillmentStatus(status: string) {
    if (!order) return;
    startStatusUpdate(async () => {
      try {
        const response = await fetch(
          `/api/admin/orders/${encodeURIComponent(order.id)}/fulfillment`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status }),
          },
        );
        const result: unknown = await response.json().catch(() => null);
        if (!response.ok) {
          const message =
            result &&
            typeof result === "object" &&
            "error" in result &&
            typeof result.error === "string"
              ? result.error
              : "Unable to update fulfillment status.";
          throw new Error(message);
        }
        setOrderResult((current) =>
          current?.id === order.id && current.order
            ? { ...current, order: { ...current.order, fulfillmentStatus: status } }
            : current,
        );
        showToast("Fulfillment status updated.");
        router.refresh();
      } catch (updateError) {
        const message =
          updateError instanceof Error
            ? updateError.message
            : "Unable to update fulfillment status.";
        showToast(message, "error");
      }
    });
  }

  const customerName =
    [order?.customerFirstName, order?.customerLastName].filter(Boolean).join(" ") ||
    order?.user?.name ||
    "Guest customer";
  const address = order
    ? [
        order.shippingName,
        order.shippingLine1,
        order.shippingLine2,
        [order.shippingCity, order.shippingState, order.shippingPostalCode].filter(Boolean).join(", "),
        order.shippingCountry,
      ].filter(Boolean)
    : [];

  return (
    <>
      <dialog
        aria-labelledby="order-details-title"
        className="m-auto max-h-[92vh] w-[min(48rem,calc(100%-1.5rem))] max-w-none overflow-y-auto rounded-2xl border-0 bg-white p-0 text-[#171a14] shadow-2xl backdrop:bg-black/55"
        onClose={onClose}
        onClick={(event) => {
          if (event.target === event.currentTarget) event.currentTarget.close();
        }}
        ref={dialogRef}
      >
        <section className="p-5 sm:p-7">
          <header className="flex items-start justify-between gap-4 border-b border-black/10 pb-5">
            <div>
              <p className="text-xs font-bold uppercase tracking-[.12em] text-[#718126]">
                Order details
              </p>
              <h2 className="mt-2 break-all text-xl font-black" id="order-details-title">
                {order?.providerReference ?? "Loading order"}
              </h2>
            </div>
            <button
              aria-label="Close order details"
              className="grid min-h-10 min-w-10 place-items-center rounded-lg border border-black/15 text-xl hover:bg-stone-50"
              onClick={() => dialogRef.current?.close()}
              type="button"
            >
              ×
            </button>
          </header>

          {loading && <p className="py-8 text-sm text-[#65695f]">Loading order details…</p>}
          {error && (
            <p className="py-8 text-sm text-rose-700" role="alert">
              {error}
            </p>
          )}
          {order && !loading && (
            <div className="grid gap-6 py-6">
              <section className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#65695f]">
                    Customer
                  </p>
                  <p className="mt-1 font-bold">{customerName}</p>
                  <p className="text-sm text-[#65695f]">{order.email}</p>
                  {order.customerPhone && (
                    <p className="text-sm text-[#65695f]">{order.customerPhone}</p>
                  )}
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#65695f]">
                    Placed
                  </p>
                  <p className="mt-1 font-medium">
                    {new Intl.DateTimeFormat("en-US", { dateStyle: "long" }).format(
                      new Date(order.createdAt),
                    )}
                  </p>
                  <p className="mt-2 text-sm text-[#65695f]">
                    Payment: {order.paymentProvider.replaceAll("_", " ")}
                  </p>
                </div>
              </section>

              <section className="grid gap-4 rounded-xl bg-[#f5f6f2] p-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#65695f]">
                    Payment status
                  </p>
                  <div className="mt-2">
                    <OrderStatusBadge kind="payment" status={order.status} />
                  </div>
                </div>
                <label className="grid gap-1.5 text-xs font-semibold text-[#55594f]">
                  Fulfillment status
                  <select
                    className="min-h-10 rounded-lg border border-black/15 bg-white px-3 text-sm font-normal text-[#171a14] disabled:opacity-60"
                    disabled={updatingStatus}
                    onChange={(event) => updateFulfillmentStatus(event.target.value)}
                    value={order.fulfillmentStatus ?? "PROCESSING"}
                  >
                    {fulfillmentStatuses.map((status) => (
                      <option key={status} value={status}>
                        {status.charAt(0) + status.slice(1).toLowerCase()}
                      </option>
                    ))}
                  </select>
                </label>
              </section>

              <section>
                <h3 className="font-bold">Items</h3>
                <ul className="mt-3 divide-y divide-black/10 rounded-xl border border-black/10">
                  {order.items.map((item) => (
                    <li className="flex items-start justify-between gap-4 p-3 text-sm" key={item.id}>
                      <span>
                        <span className="block font-semibold">{item.name}</span>
                        <span className="mt-1 block text-xs text-[#65695f]">
                          Qty {item.quantity}
                          {item.sku ? ` · SKU ${item.sku}` : ""}
                        </span>
                      </span>
                      <span className="shrink-0 font-semibold">
                        {formatCurrency(item.priceCents * item.quantity, order.currency)}
                      </span>
                    </li>
                  ))}
                  <li className="flex justify-between gap-4 p-3 font-black">
                    <span>Total</span>
                    <span>{formatCurrency(order.totalCents, order.currency)}</span>
                  </li>
                </ul>
              </section>

              <section className="grid gap-4 sm:grid-cols-2">
                <div>
                  <h3 className="font-bold">Shipping address</h3>
                  {address.length ? (
                    <address className="mt-2 not-italic text-sm leading-6 text-[#55594f]">
                      {address.map((line, index) => (
                        <span className="block" key={`${line}-${index}`}>
                          {line}
                        </span>
                      ))}
                    </address>
                  ) : (
                    <p className="mt-2 text-sm text-[#65695f]">No shipping address provided.</p>
                  )}
                </div>
                <div>
                  <h3 className="font-bold">Tracking</h3>
                  {order.trackingNumber ? (
                    <p className="mt-2 text-sm text-[#55594f]">
                      {order.carrier} · {order.trackingNumber}
                    </p>
                  ) : (
                    <p className="mt-2 text-sm text-[#65695f]">Tracking not added.</p>
                  )}
                  {order.dhlTrackingNumber && (
                    <p className="mt-1 text-xs text-[#65695f]">
                      DHL AWB: {order.dhlTrackingNumber}
                    </p>
                  )}
                  <button
                    className="mt-3 min-h-10 rounded-lg border border-black/15 px-3 text-xs font-bold hover:bg-stone-50"
                    onClick={() => setTrackingOrder(order)}
                    type="button"
                  >
                    {order.trackingNumber ? "Edit tracking" : "Add tracking"}
                  </button>
                </div>
              </section>

              <footer className="flex flex-wrap justify-end gap-3 border-t border-black/10 pt-4">
                <a
                  className="inline-flex min-h-10 items-center rounded-lg border border-black/15 px-4 text-xs font-bold hover:bg-stone-50"
                  href={`/api/admin/orders/${encodeURIComponent(order.id)}/invoice`}
                >
                  Download invoice
                </a>
                {order.trackingUrl && (
                  <a
                    className="inline-flex min-h-10 items-center rounded-lg bg-[#171a14] px-4 text-xs font-bold text-white hover:bg-[#30352b]"
                    href={order.trackingUrl}
                    rel="noreferrer"
                    target="_blank"
                  >
                    Track shipment
                  </a>
                )}
                {!order.dhlTrackingNumber && order.status === "paid" && (
                  <button
                    className="inline-flex min-h-10 items-center rounded-lg bg-[#718126] px-4 text-xs font-bold text-white hover:bg-[#5f6d1f] disabled:opacity-60"
                    disabled={creatingShipment}
                    onClick={createDhlShipment}
                    type="button"
                  >
                    {creatingShipment ? "Generating DHL label…" : "Generate DHL waybill & label"}
                  </button>
                )}
                {order.shippingLabelUrl && (
                  <a
                    className="inline-flex min-h-10 items-center rounded-lg border border-black/15 px-4 text-xs font-bold hover:bg-stone-50"
                    href={order.shippingLabelUrl}
                    rel="noreferrer"
                    target="_blank"
                  >
                    Download DHL label
                  </a>
                )}
                {order.commercialInvoiceUrl && (
                  <a
                    className="inline-flex min-h-10 items-center rounded-lg border border-black/15 px-4 text-xs font-bold hover:bg-stone-50"
                    href={order.commercialInvoiceUrl}
                    rel="noreferrer"
                    target="_blank"
                  >
                    Download commercial invoice
                  </a>
                )}
                {order.dhlTrackingNumber && !order.dhlPickupConfirmationNumber && (
                  <button
                    className="inline-flex min-h-10 items-center rounded-lg border border-black/15 px-4 text-xs font-bold hover:bg-stone-50 disabled:opacity-60"
                    disabled={schedulingPickup}
                    onClick={() => void scheduleDhlPickup()}
                    type="button"
                  >
                    {schedulingPickup ? "Scheduling pickup…" : "Schedule DHL pickup"}
                  </button>
                )}
                {order.dhlPickupConfirmationNumber && (
                  <span className="inline-flex min-h-10 items-center border border-black/10 bg-[#f5f6f2] px-4 text-xs font-bold">
                    Pickup confirmation: {order.dhlPickupConfirmationNumber}
                  </span>
                )}
              </footer>
            </div>
          )}
        </section>
      </dialog>
      <AdminFulfillmentModal
        onClose={() => setTrackingOrder(null)}
        order={trackingOrder}
      />
    </>
  );
}
