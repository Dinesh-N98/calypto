"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ToastProvider";

export type AdminOrderFulfillment = {
  id: string;
  providerReference: string;
  fulfillmentStatus: string | null;
  carrier: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
};

export function AdminFulfillmentModal({
  order,
  onClose,
}: {
  order: AdminOrderFulfillment | null;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const { showToast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (order && !dialog.open) dialog.showModal();
    if (!order && dialog.open) dialog.close();
  }, [order]);

  async function saveFulfillment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!order) return;
    setIsSaving(true);
    setError("");

    const formData = new FormData(event.currentTarget);
    try {
      const response = await fetch(
        `/api/admin/orders/${encodeURIComponent(order.id)}/fulfillment`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            carrier: formData.get("carrier"),
            trackingNumber: formData.get("trackingNumber"),
            trackingUrl: formData.get("trackingUrl"),
          }),
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
            : "Unable to update fulfillment details.";
        throw new Error(message);
      }

      showToast("Order tracking details saved.");
      dialogRef.current?.close();
      router.refresh();
    } catch (saveError) {
      const message =
        saveError instanceof Error ? saveError.message : "Unable to update fulfillment details.";
      setError(message);
      showToast(message, "error");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <dialog
      aria-labelledby="fulfillment-title"
      className="m-auto max-h-[90vh] w-[min(34rem,calc(100%-2rem))] max-w-none overflow-y-auto border-0 bg-white p-0 text-[#161812] shadow-2xl backdrop:bg-black/60"
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) dialogRef.current?.close();
      }}
      ref={dialogRef}
    >
      {order && (
        <section className="p-5 sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[.12em] text-[#718126]">
                Order fulfillment
              </p>
              <h2 className="mt-2 text-xl font-black" id="fulfillment-title">
                {order.providerReference}
              </h2>
            </div>
            <button
              aria-label="Close fulfillment form"
              className="grid min-h-10 min-w-10 place-items-center border border-black/20 text-xl"
              onClick={() => dialogRef.current?.close()}
              type="button"
            >
              ×
            </button>
          </div>
          <form className="mt-6 grid gap-4" onSubmit={saveFulfillment}>
            <label className="grid gap-2 text-xs font-bold text-[#55594f]">
              Carrier name
              <input
                autoFocus
                className="admin-catalog-input"
                defaultValue={order.carrier ?? ""}
                maxLength={100}
                name="carrier"
                placeholder="DHL"
                required
              />
            </label>
            <label className="grid gap-2 text-xs font-bold text-[#55594f]">
              Tracking number
              <input
                className="admin-catalog-input"
                defaultValue={order.trackingNumber ?? ""}
                maxLength={200}
                name="trackingNumber"
                required
              />
            </label>
            <label className="grid gap-2 text-xs font-bold text-[#55594f]">
              Tracking URL (optional)
              <input
                className="admin-catalog-input"
                defaultValue={order.trackingUrl ?? ""}
                maxLength={2000}
                name="trackingUrl"
                placeholder="Generated automatically for DHL when blank"
                type="url"
              />
            </label>
            {error && (
              <p className="text-sm text-red-700" role="alert">
                {error}
              </p>
            )}
            <div className="flex flex-wrap justify-end gap-3 border-t border-black/10 pt-4">
              <button
                className="min-h-11 border border-black/20 px-4 text-xs font-bold uppercase tracking-[.08em]"
                onClick={() => dialogRef.current?.close()}
                type="button"
              >
                Cancel
              </button>
              <button
                className="min-h-11 bg-[#171a14] px-4 text-xs font-bold uppercase tracking-[.08em] text-white disabled:opacity-60"
                disabled={isSaving}
                type="submit"
              >
                {isSaving ? "Saving..." : "Save tracking details"}
              </button>
            </div>
          </form>
        </section>
      )}
    </dialog>
  );
}
