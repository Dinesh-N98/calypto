"use client";

import { FormEvent, useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Search } from "lucide-react";
import {
  NEWSLETTER_DISCOUNT_CODE_PATTERN,
  normalizeNewsletterDiscountCode,
} from "@/lib/newsletter/discount-redemption";

type DiscountLookup = {
  code: string;
  email: string;
  status: string;
  discountPercent: number;
  lookupStatus:
    | "VALID"
    | "ALREADY_REDEEMED"
    | "NOT_FOUND"
    | "INELIGIBLE"
    | "EMAIL_MISMATCH";
  redeemedAt: string | null;
  orderReference: string | null;
  redemption: {
    redeemedAt: string;
    redeemedBy: string;
    note: string | null;
  } | null;
};

type NewsletterSubscriber = {
  id: string;
  email: string;
  code: string | null;
  subscriptionStatus: string;
  codeStatus: "REDEEMED" | "AVAILABLE";
  createdAt?: string | null;
  subscribedAt?: string | null;
  redemptionDate: string | null;
  orderReference: string | null;
};

type SubscriberListResponse = {
  subscribers: NewsletterSubscriber[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function NewsletterDiscountManager() {
  const [code, setCode] = useState("");
  const [lookup, setLookup] = useState<DiscountLookup | null>(null);
  const [searched, setSearched] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [orderReference, setOrderReference] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [subscribers, setSubscribers] = useState<NewsletterSubscriber[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalSubscribers, setTotalSubscribers] = useState(0);
  const [listBusy, setListBusy] = useState(false);

  async function loadSubscribers(nextPage = 1, nextSearch = searchTerm) {
    setListBusy(true);
    try {
      const params = new URLSearchParams({ page: String(nextPage), limit: String(pageSize) });
      if (nextSearch.trim()) params.set("search", nextSearch.trim());
      const response = await fetch(`/api/admin/newsletter-discounts?${params.toString()}`, {
        cache: "no-store",
      });
      const body = (await response.json()) as Partial<SubscriberListResponse> & { error?: string };
      if (!response.ok) {
        setFeedback(body.error ?? "Unable to load subscribers.");
        return;
      }
      setSubscribers(body.subscribers ?? []);
      setPage(body.page ?? 1);
      setTotalPages(body.totalPages ?? 1);
      setTotalSubscribers(body.total ?? 0);
    } catch {
      setFeedback("Unable to load the subscriber list. Please try again.");
    } finally {
      setListBusy(false);
    }
  }

  useEffect(() => {
    void loadSubscribers(1, "");
  }, []);

  async function lookupCode(event?: FormEvent<HTMLFormElement>, overrideCode?: string) {
    event?.preventDefault();
    const normalized = normalizeNewsletterDiscountCode(overrideCode ?? code);
    setFeedback("");
    setConfirming(false);
    setLookup(null);
    setSearched(false);
    if (!normalized) {
      setFeedback("Enter a code in the format CREW-XXXXXXXX.");
      return;
    }

    setBusy(true);
    try {
      const response = await fetch(
        `/api/admin/newsletter-discounts?code=${encodeURIComponent(normalized)}`,
        { cache: "no-store" },
      );
      const body = (await response.json()) as {
        subscription?: DiscountLookup | null;
        error?: string;
      };
      if (!response.ok) {
        setFeedback(body.error ?? "Unable to look up this code.");
        return;
      }
      setCode(normalized);
      setLookup(body.subscription ?? null);
      setSearched(true);
    } catch {
      setFeedback("Unable to reach the server. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function markRedeemed() {
    const normalized = normalizeNewsletterDiscountCode(code);
    if (!normalized || !confirming || !customerEmail.trim() || lookup?.lookupStatus !== "VALID") return;
    setBusy(true);
    setFeedback("");
    try {
      const response = await fetch("/api/admin/newsletter-discounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: normalized,
          email: customerEmail.trim(),
          orderReference: orderReference.trim(),
          note: note.trim(),
        }),
        cache: "no-store",
      });
      const body = (await response.json()) as {
        redeemed?: boolean;
        lookupStatus?: DiscountLookup["lookupStatus"];
        error?: string;
      };
      if (!response.ok) {
        setFeedback(
          body.lookupStatus === "ALREADY_REDEEMED"
            ? "This code has already been redeemed. Refresh the lookup for its audit details."
            : body.lookupStatus === "EMAIL_MISMATCH"
              ? "This discount code is tied to a different email address."
              : body.error ?? "Unable to mark this code as redeemed.",
        );
        setConfirming(false);
        return;
      }
      setConfirming(false);
      await lookupCode();
      await loadSubscribers(page, searchTerm);
      setFeedback("Code marked as redeemed.");
    } catch {
      setFeedback("Unable to reach the server. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const lookupStatusLabel = lookup
    ? {
        VALID: "Valid — not yet redeemed",
        ALREADY_REDEEMED: "Already redeemed",
        NOT_FOUND: "Not found",
        INELIGIBLE: "Not eligible",
        EMAIL_MISMATCH: "Email does not match subscriber",
      }[lookup.lookupStatus]
    : searched
      ? "Not found"
      : "";

  const pageNumbers = Array.from({ length: totalPages }, (_, index) => index + 1);

  return (
    <div className="max-w-6xl space-y-6">
      <section className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.14em] text-[#718126]">Quick lookup</p>
            <h2 className="mt-1 text-xl font-black tracking-[-.03em]">Check a discount code</h2>
          </div>
        </div>

        <form className="flex flex-col gap-3 sm:flex-row" onSubmit={(event) => void lookupCode(event)}>
          <label className="grid flex-1 gap-2 text-sm font-semibold" htmlFor="newsletter-discount-code">
            Discount code
            <input
              autoComplete="off"
              className="min-h-11 rounded-md border border-black/20 bg-white px-3 font-mono uppercase outline-none focus-visible:ring-2 focus-visible:ring-[#718126]"
              id="newsletter-discount-code"
              maxLength={13}
              onChange={(event) => {
                setCode(event.currentTarget.value.toUpperCase());
                setLookup(null);
                setSearched(false);
                setConfirming(false);
              }}
              pattern={NEWSLETTER_DISCOUNT_CODE_PATTERN.source}
              placeholder="CREW-XXXXXXXX"
              value={code}
            />
          </label>
          <button
            className="mt-auto min-h-11 rounded-md bg-[#718126] px-5 text-sm font-bold text-white hover:bg-[#59671d] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#718126] disabled:opacity-60"
            disabled={busy}
            type="submit"
          >
            {busy ? "Please wait..." : "Look up code"}
          </button>
        </form>

        {feedback && (
          <p aria-live="polite" className="mt-4 text-sm text-[#4e5d1c]" role="status">
            {feedback}
          </p>
        )}

        {searched && (
          <section aria-live="polite" className="mt-5 rounded-lg border border-black/10 bg-[#f9faf7] p-5">
            <h3 className="text-lg font-bold">Code status: {lookupStatusLabel}</h3>
            {lookup && (
              <>
                <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="font-semibold text-[#65695f]">Subscriber email</dt>
                    <dd className="mt-1 break-all">{lookup.email}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-[#65695f]">Discount</dt>
                    <dd className="mt-1">{lookup.discountPercent}% of product subtotal only</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-[#65695f]">Subscription status</dt>
                    <dd className="mt-1">{lookup.status}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-[#65695f]">Shipping and tax</dt>
                    <dd className="mt-1">Not discounted</dd>
                  </div>
                </dl>
                {lookup.redemption && (
                  <div className="mt-5 border-t border-black/10 pt-4 text-sm">
                    <h4 className="font-bold">Redemption audit</h4>
                    <p className="mt-2">
                      Redeemed {formatDate(lookup.redemption.redeemedAt)} by {lookup.redemption.redeemedBy}
                    </p>
                    {lookup.orderReference && <p>Order reference: {lookup.orderReference}</p>}
                    {lookup.redemption.note && <p>Note: {lookup.redemption.note}</p>}
                  </div>
                )}
                {lookup.lookupStatus === "VALID" && (
                  <div className="mt-5 border-t border-black/10 pt-4">
                    <label className="grid gap-2 text-sm font-semibold">
                      Customer email used for the order
                      <input
                        className="min-h-10 rounded-md border border-black/20 px-3 font-normal"
                        maxLength={254}
                        onChange={(event) => setCustomerEmail(event.currentTarget.value)}
                        required
                        type="email"
                        value={customerEmail}
                      />
                    </label>
                    <label className="mt-3 grid gap-2 text-sm font-semibold">
                      Order reference / ID (optional)
                      <input
                        className="min-h-10 rounded-md border border-black/20 px-3 font-normal"
                        maxLength={191}
                        onChange={(event) => setOrderReference(event.currentTarget.value)}
                        value={orderReference}
                      />
                    </label>
                    <label className="mt-3 grid gap-2 text-sm font-semibold">
                      Redemption note (optional)
                      <textarea
                        className="min-h-20 rounded-md border border-black/20 px-3 py-2 font-normal"
                        maxLength={2_000}
                        onChange={(event) => setNote(event.currentTarget.value)}
                        value={note}
                      />
                    </label>
                    {!confirming ? (
                      <button
                        className="mt-4 min-h-11 rounded-md border border-[#718126] px-4 text-sm font-bold text-[#4e5d1c] hover:bg-[#f0f2e8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#718126]"
                        onClick={() => setConfirming(true)}
                        type="button"
                      >
                        Mark as redeemed
                      </button>
                    ) : (
                      <div className="mt-4 rounded-md border border-amber-500/50 bg-amber-50 p-4">
                        <p className="text-sm font-semibold">
                          Confirm this code was applied to the subscriber&apos;s first order. This cannot be undone.
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            className="min-h-11 rounded-md bg-[#718126] px-4 text-sm font-bold text-white disabled:opacity-60"
                            disabled={busy || !customerEmail.trim()}
                            onClick={markRedeemed}
                            type="button"
                          >
                            Confirm redemption
                          </button>
                          <button
                            className="min-h-11 rounded-md border border-black/20 px-4 text-sm font-semibold"
                            disabled={busy}
                            onClick={() => setConfirming(false)}
                            type="button"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </section>
        )}
      </section>

      <section className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.14em] text-[#718126]">Subscribers</p>
            <h2 className="mt-1 text-xl font-black tracking-[-.03em]">All newsletter recipients</h2>
          </div>
          <form
            className="flex flex-col gap-2 sm:flex-row"
            onSubmit={(event) => {
              event.preventDefault();
              void loadSubscribers(1, searchTerm);
            }}
          >
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#65695f]" />
              <input
                className="min-h-11 w-full rounded-md border border-black/20 bg-[#f8f9f6] pl-9 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[#718126] sm:w-64"
                onChange={(event) => setSearchTerm(event.currentTarget.value)}
                placeholder="Search email or code"
                type="search"
                value={searchTerm}
              />
            </label>
            <button
              className="min-h-11 rounded-md border border-black/20 px-4 text-sm font-semibold hover:bg-[#f2f4ee]"
              disabled={listBusy}
              type="submit"
            >
              Search
            </button>
          </form>
        </div>

        <div className="overflow-hidden rounded-xl border border-black/10">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-black/10 text-left text-sm">
              <thead className="bg-[#f3f5ef] text-[#4b5147]">
                <tr>
                  <th className="px-4 py-3 font-semibold">Subscriber Email</th>
                  <th className="px-4 py-3 font-semibold">Subscribed Date</th>
                  <th className="px-4 py-3 font-semibold">Discount Code</th>
                  <th className="px-4 py-3 font-semibold">Subscription Status</th>
                  <th className="px-4 py-3 font-semibold">Code Status</th>
                  <th className="px-4 py-3 font-semibold">Redemption Date / Order</th>
                  <th className="px-4 py-3 font-semibold text-right">Quick Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/10 bg-white">
                {listBusy && subscribers.length === 0 ? (
                  <tr>
                    <td className="px-4 py-8 text-center text-[#65695f]" colSpan={7}>
                      Loading subscribers...
                    </td>
                  </tr>
                ) : subscribers.length === 0 ? (
                  <tr>
                    <td className="px-4 py-8 text-center text-[#65695f]" colSpan={7}>
                      No subscribers match this search.
                    </td>
                  </tr>
                ) : (
                  subscribers.map((subscriber) => (
                    <tr key={subscriber.id} className="align-top">
                      <td className="px-4 py-3 font-medium text-[#1d1f1a]">{subscriber.email}</td>
                      <td className="px-4 py-3 text-[#2d312a]">
                        {subscriber.subscribedAt ?? subscriber.createdAt ? (
                          formatDate(subscriber.subscribedAt ?? subscriber.createdAt ?? new Date().toISOString())
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-[#2a2d26]">
                        {subscriber.code ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex rounded-full bg-[#eef3d8] px-2.5 py-1 text-xs font-semibold text-[#47511b]">
                          {subscriber.subscriptionStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {subscriber.codeStatus === "REDEEMED" ? (
                          <span className="inline-flex rounded-full bg-[#dfe9ca] px-2.5 py-1 text-xs font-semibold text-[#314115]">
                            Redeemed
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full bg-[#ebefe8] px-2.5 py-1 text-xs font-semibold text-[#4d5349]">
                            Available
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-[#4e554d]">
                        {subscriber.redemptionDate ? (
                          <div>
                            <div>{formatDate(subscriber.redemptionDate)}</div>
                            {subscriber.orderReference ? (
                              <div className="mt-1 text-xs text-[#65695f]">
                                Order: {subscriber.orderReference}
                              </div>
                            ) : null}
                          </div>
                        ) : (
                          <span className="text-[#65695f]">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          className="inline-flex min-h-9 items-center justify-center rounded-md border border-[#718126] px-3 text-xs font-bold text-[#4e5d1c] hover:bg-[#f0f2e8]"
                          onClick={() => {
                            if (!subscriber.code) return;
                            void lookupCode(undefined, subscriber.code);
                          }}
                          type="button"
                        >
                          View / Lookup
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-5 flex flex-col items-center justify-between gap-3 border-t border-black/10 pt-4 sm:flex-row">
          <p className="text-sm text-[#65695f]">
            Showing {subscribers.length} of {totalSubscribers} subscribers
          </p>
          <div className="flex items-center gap-2">
            <button
              className="inline-flex min-h-9 items-center gap-1 rounded-md border border-black/15 px-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
              disabled={page <= 1 || listBusy}
              onClick={() => {
                const nextPage = Math.max(1, page - 1);
                void loadSubscribers(nextPage, searchTerm);
              }}
              type="button"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Previous
            </button>
            <div className="flex items-center gap-1">
              {pageNumbers.map((pageNumber) => (
                <button
                  className={`h-9 min-w-9 rounded-md px-2 text-sm font-semibold ${pageNumber === page ? "bg-[#718126] text-white" : "border border-black/15 bg-white text-[#2c3129] hover:bg-[#f3f5ef]"}`}
                  disabled={listBusy}
                  key={pageNumber}
                  onClick={() => void loadSubscribers(pageNumber, searchTerm)}
                  type="button"
                >
                  {pageNumber}
                </button>
              ))}
            </div>
            <button
              className="inline-flex min-h-9 items-center gap-1 rounded-md border border-black/15 px-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
              disabled={page >= totalPages || listBusy}
              onClick={() => {
                const nextPage = Math.min(totalPages, page + 1);
                void loadSubscribers(nextPage, searchTerm);
              }}
              type="button"
            >
              Next
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
