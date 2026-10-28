"use client";

import { FormEvent, useState } from "react";
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

  async function lookupCode(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    const normalized = normalizeNewsletterDiscountCode(code);
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

  return (
    <div className="max-w-3xl space-y-6">
      <form className="flex flex-col gap-3 sm:flex-row" onSubmit={lookupCode}>
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
        <p aria-live="polite" className="text-sm text-[#4e5d1c]" role="status">
          {feedback}
        </p>
      )}

      {searched && (
        <section aria-live="polite" className="rounded-lg border border-black/10 bg-white p-5">
          <h2 className="text-lg font-bold">Code status: {lookupStatusLabel}</h2>
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
                  <h3 className="font-bold">Redemption audit</h3>
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
    </div>
  );
}
