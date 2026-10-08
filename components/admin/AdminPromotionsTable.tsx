"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { useState, useTransition } from "react";
import {
  createPromotion,
  deletePromotion,
  setPromotionActive,
  updatePromotion,
} from "@/app/admin/promotion-actions";
import { useToast } from "@/components/ToastProvider";

type PromotionRecord = {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  discountPercent: number | null;
  discountCode: string | null;
  isActive: boolean;
  startDate: string;
  endDate: string;
};
type ActionResult = { ok: true; message: string } | { ok: false; error: string };

function PromotionForm({
  promotion,
  onClose,
  onComplete,
}: {
  promotion?: PromotionRecord;
  onClose: () => void;
  onComplete: (result: ActionResult) => void;
}) {
  const { showToast } = useToast();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    const formData = new FormData(form);
    if (promotion) formData.set("id", promotion.id);

    startTransition(async () => {
      try {
        const result = promotion
          ? await updatePromotion(formData)
          : await createPromotion(formData);
        if (result.ok) onComplete(result);
        else {
          setError(result.error);
          showToast(result.error, "error");
        }
      } catch {
        const message = "The promotion could not be saved. Please try again.";
        setError(message);
        showToast(message, "error");
      }
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/45"
      onClick={(event) => {
        if (event.target === event.currentTarget && !pending) onClose();
      }}
    >
      <section
        aria-labelledby="promotion-form-title"
        aria-modal="true"
        className="flex h-full w-full max-w-xl flex-col bg-white shadow-2xl"
        role="dialog"
      >
        <header className="flex items-start justify-between border-b border-black/10 px-6 py-5">
          <div>
            <p className="text-[.65rem] font-bold uppercase tracking-[.13em] text-[#718126]">
              Storefront offers
            </p>
            <h2 className="mt-1 text-xl font-black" id="promotion-form-title">
              {promotion ? "Edit promotion" : "Create promotion"}
            </h2>
          </div>
          <button
            aria-label="Close promotion form"
            className="grid h-10 w-10 place-items-center rounded-md text-[#55594f] hover:bg-black/5"
            disabled={pending}
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" className="h-5 w-5" />
          </button>
        </header>
        <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit}>
          <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
            {error && (
              <p
                aria-live="assertive"
                className="rounded-md border border-red-700/20 bg-red-50 px-3 py-2 text-sm text-red-800"
              >
                {error}
              </p>
            )}
            <label className="block text-xs font-bold text-[#55594f]">
              Title
              <input
                autoFocus
                className="admin-catalog-input"
                defaultValue={promotion?.title ?? ""}
                maxLength={120}
                name="title"
                required
              />
            </label>
            <label className="block text-xs font-bold text-[#55594f]">
              Description
              <textarea
                className="admin-catalog-input min-h-28 resize-y py-3"
                defaultValue={promotion?.description ?? ""}
                maxLength={2000}
                name="description"
                required
                rows={4}
              />
            </label>
            <label className="block text-xs font-bold text-[#55594f]">
              Image URL
              <input
                className="admin-catalog-input"
                defaultValue={promotion?.imageUrl ?? ""}
                maxLength={2048}
                name="imageUrl"
                placeholder="/promotions/spring-sale.jpg"
                required
              />
              <span className="mt-1 block text-xs font-normal text-[#73786b]">
                Use a site-relative path or an HTTPS image URL.
              </span>
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-xs font-bold text-[#55594f]">
                Discount rate (%)
                <input
                  className="admin-catalog-input"
                  defaultValue={promotion?.discountPercent ?? ""}
                  max={100}
                  min={1}
                  name="discountPercent"
                  placeholder="15"
                  type="number"
                />
              </label>
              <label className="block text-xs font-bold text-[#55594f]">
                Discount code
                <input
                  className="admin-catalog-input"
                  defaultValue={promotion?.discountCode ?? ""}
                  maxLength={50}
                  name="discountCode"
                  placeholder="SPRING15"
                />
              </label>
              <label className="block text-xs font-bold text-[#55594f]">
                Starts on (optional)
                <input
                  className="admin-catalog-input"
                  defaultValue={promotion?.startDate ?? ""}
                  name="startDate"
                  type="date"
                />
              </label>
              <label className="block text-xs font-bold text-[#55594f]">
                Ends on (optional)
                <input
                  className="admin-catalog-input"
                  defaultValue={promotion?.endDate ?? ""}
                  name="endDate"
                  type="date"
                />
              </label>
            </div>
            <label className="flex items-center gap-3 text-sm font-semibold text-[#42463b]">
              <input
                className="h-4 w-4 accent-[#718126]"
                defaultChecked={promotion?.isActive ?? true}
                name="isActive"
                type="checkbox"
              />
              Active
            </label>
          </div>
          <footer className="flex justify-end gap-3 border-t border-black/10 px-6 py-4">
            <button
              className="min-h-11 rounded-md border border-black/15 px-4 text-xs font-bold hover:bg-[#f4f5f1]"
              disabled={pending}
              onClick={onClose}
              type="button"
            >
              Cancel
            </button>
            <button
              className="min-h-11 rounded-md bg-[#a3bd32] px-5 text-xs font-extrabold uppercase tracking-[.08em] text-[#171a14] hover:bg-[#b6cf45]"
              disabled={pending}
              type="submit"
            >
              {pending ? "Saving..." : promotion ? "Save changes" : "Create promotion"}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: "UTC" }).format(
    new Date(`${value}T00:00:00Z`),
  );
}

export function AdminPromotionsTable({ promotions }: { promotions: PromotionRecord[] }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [formPromotion, setFormPromotion] = useState<PromotionRecord | null | undefined>();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function completeAction(result: ActionResult, close?: () => void) {
    if (!result.ok) return;
    close?.();
    showToast(result.message);
    router.refresh();
  }

  function togglePromotion(promotion: PromotionRecord) {
    setPendingId(promotion.id);
    startTransition(async () => {
      try {
        const result = await setPromotionActive(promotion.id, !promotion.isActive);
        if (result.ok) completeAction(result);
        else showToast(result.error, "error");
      } catch {
        showToast("The promotion status could not be changed. Please try again.", "error");
      } finally {
        setPendingId(null);
      }
    });
  }

  function removePromotion(promotion: PromotionRecord) {
    if (!window.confirm(`Permanently delete "${promotion.title}"?`)) return;
    setPendingId(promotion.id);
    startTransition(async () => {
      try {
        const result = await deletePromotion(promotion.id);
        if (result.ok) completeAction(result);
        else showToast(result.error, "error");
      } catch {
        showToast("The promotion could not be deleted. Please try again.", "error");
      } finally {
        setPendingId(null);
      }
    });
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link className="text-xs font-bold text-[#687b26] hover:underline" href="/admin">
            Admin dashboard
          </Link>
          <h1 className="mt-2 text-3xl font-black tracking-[-.04em] sm:text-4xl">Promotions</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#65695f]">
            Manage scheduled offers shown on the storefront homepage.
          </p>
        </div>
        <button
          className="inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-md bg-[#a3bd32] px-4 text-xs font-extrabold uppercase tracking-[.08em] text-[#171a14] hover:bg-[#b6cf45] sm:self-auto"
          onClick={() => setFormPromotion(null)}
          type="button"
        >
          <Plus aria-hidden="true" className="h-4 w-4" />
          Add promotion
        </button>
      </header>

      {promotions.length === 0 ? (
        <section className="rounded-lg border border-dashed border-black/20 bg-white px-6 py-12 text-center">
          <h2 className="text-base font-bold">No promotions yet</h2>
          <p className="mt-2 text-sm text-[#65695f]">
            Create a promotion to add an offer to the storefront homepage.
          </p>
        </section>
      ) : (
        <section aria-label="Promotion list" className="grid gap-4 xl:grid-cols-2">
          {promotions.map((promotion) => (
            <article
              className="overflow-hidden rounded-lg border border-black/10 bg-white shadow-sm"
              key={promotion.id}
            >
              <div className="grid sm:grid-cols-[12rem_minmax(0,1fr)]">
                <div className="relative min-h-44 bg-[#e9ebdf] sm:min-h-full">
                  <Image
                    alt=""
                    className="object-cover"
                    fill
                    sizes="(min-width: 640px) 12rem, 100vw"
                    src={promotion.imageUrl}
                    unoptimized
                  />
                </div>
                <div className="min-w-0 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="truncate text-base font-black">{promotion.title}</h2>
                      <span
                        className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-[.68rem] font-bold ${promotion.isActive ? "bg-green-50 text-green-800" : "bg-[#f1f2ee] text-[#65695f]"}`}
                      >
                        {promotion.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <button
                        aria-label={`Edit ${promotion.title}`}
                        className="grid h-9 w-9 place-items-center rounded-md text-[#55594f] hover:bg-[#eef2df] hover:text-[#53641d]"
                        onClick={() => setFormPromotion(promotion)}
                        title="Edit promotion"
                        type="button"
                      >
                        <Pencil aria-hidden="true" className="h-4 w-4" />
                      </button>
                      <button
                        aria-label={`Delete ${promotion.title}`}
                        className="grid h-9 w-9 place-items-center rounded-md text-[#8f3b36] hover:bg-red-50 hover:text-red-800 disabled:opacity-40"
                        disabled={pending}
                        onClick={() => removePromotion(promotion)}
                        title="Delete promotion"
                        type="button"
                      >
                        <Trash2 aria-hidden="true" className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <p className="mt-3 line-clamp-2 text-sm leading-5 text-[#65695f]">
                    {promotion.description}
                  </p>
                  {(promotion.discountPercent || promotion.discountCode) && (
                    <p className="mt-3 text-sm font-bold text-[#53641d]">
                      {promotion.discountPercent ? `${promotion.discountPercent}% off` : ""}
                      {promotion.discountPercent && promotion.discountCode ? " · " : ""}
                      {promotion.discountCode ? `Code: ${promotion.discountCode}` : ""}
                    </p>
                  )}
                  <p className="mt-3 text-xs text-[#73786b]">
                    {promotion.startDate ? formatDate(promotion.startDate) : "No start date"}
                    {" – "}
                    {promotion.endDate ? formatDate(promotion.endDate) : "No end date"}
                  </p>
                  <button
                    aria-label={`${promotion.isActive ? "Deactivate" : "Activate"} ${promotion.title}`}
                    aria-pressed={promotion.isActive}
                    className="mt-4 min-h-10 rounded-md border border-black/15 px-3 text-xs font-bold hover:bg-[#f4f5f1] disabled:opacity-50"
                    disabled={pending}
                    onClick={() => togglePromotion(promotion)}
                    type="button"
                  >
                    {pendingId === promotion.id
                      ? "Updating..."
                      : promotion.isActive
                        ? "Deactivate"
                        : "Activate"}
                  </button>
                </div>
              </div>
            </article>
          ))}
        </section>
      )}

      {formPromotion !== undefined && (
        <PromotionForm
          onClose={() => setFormPromotion(undefined)}
          onComplete={(result) => completeAction(result, () => setFormPromotion(undefined))}
          promotion={formPromotion ?? undefined}
        />
      )}
    </div>
  );
}
