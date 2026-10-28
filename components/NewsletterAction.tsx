"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getCookieConsent, subscribeCookieConsent } from "@/lib/cookieConsent";
import { GA_READY_EVENT, trackNewsletterConfirmationOnce } from "@/lib/ga-events";
import {
  clearNewsletterPopupPreference,
  rememberNewsletterSubscribed,
} from "@/lib/newsletter/popup-storage";

type NewsletterActionProps = {
  action: "confirm" | "unsubscribe";
  token: string;
};

type ActionResult = {
  ok?: boolean;
  message?: string;
  error?: string;
  discountCode?: string;
};

export function NewsletterAction({ action, token }: NewsletterActionProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<ActionResult | null>(null);
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "error">("idle");

  useEffect(() => {
    if (action !== "confirm" || !result?.ok || !result.discountCode) return;

    const trackIfAllowed = () => {
      if (getCookieConsent()?.performance === true) {
        trackNewsletterConfirmationOnce();
      }
    };

    trackIfAllowed();
    window.addEventListener(GA_READY_EVENT, trackIfAllowed);
    const unsubscribe = subscribeCookieConsent(trackIfAllowed);
    return () => {
      window.removeEventListener(GA_READY_EVENT, trackIfAllowed);
      unsubscribe();
    };
  }, [action, result]);

  async function submit() {
    if (isSubmitting || !token) return;
    setIsSubmitting(true);
    setResult(null);

    try {
      const response = await fetch(`/api/subscribe/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
        cache: "no-store",
      });
      const body = (await response.json()) as ActionResult;
      setResult(response.ok ? body : { error: body.error });
      if (response.ok && action === "confirm" && body.ok && body.discountCode) {
        rememberNewsletterSubscribed();
      }
    } catch {
      setResult({ error: "Unable to process your request. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  }

  const successMessage =
    action === "confirm"
      ? "Your email is confirmed. Your first-order discount code is:"
      : "You have been unsubscribed from Calypto emails.";

  function prepareResubscribe() {
    if (!result?.error) return;
    clearNewsletterPopupPreference();
  }

  async function copyDiscountCode() {
    if (!result?.discountCode) return;
    try {
      await navigator.clipboard.writeText(result.discountCode);
      setCopyStatus("copied");
    } catch {
      setCopyStatus("error");
    }
  }

  return (
    <main className="mx-auto flex min-h-[65vh] max-w-xl flex-col justify-center px-6 py-16 text-center">
      <p className="text-xs font-bold uppercase tracking-[.18em] text-olive">Calypto</p>
      <h1 className="mt-3 text-3xl font-black tracking-tight">
        {action === "confirm" ? "Confirm your subscription" : "Unsubscribe from emails"}
      </h1>
      {!result && (
        <>
          <p className="mt-4 text-sm leading-7 text-[#55584e]">
            {action === "confirm"
              ? "Confirm your email to receive Calypto offers, new designs, fishing tips, and your first-order discount."
              : "Use the button below to stop receiving Calypto marketing emails."}
          </p>
          <button
            className="mx-auto mt-7 inline-flex min-h-12 items-center justify-center rounded-lg bg-olive px-6 text-sm font-bold text-white disabled:opacity-60"
            disabled={isSubmitting || !token}
            onClick={submit}
            type="button"
          >
            {isSubmitting
              ? "Please wait..."
              : action === "confirm"
                ? "Confirm my subscription"
                : "Unsubscribe"}
          </button>
        </>
      )}
      {result?.ok && (
        <section aria-live="polite" className="mt-6">
          <p className="text-sm leading-7 text-[#b8baae]">{successMessage}</p>
          {action === "confirm" && result.discountCode && (
            <>
              <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                <p className="min-w-[15rem] max-w-full select-all rounded-lg border border-[#c8cbbb] bg-white px-5 py-3 font-mono text-xl font-bold tracking-widest text-[#171a14] shadow-sm">
                  {result.discountCode}
                </p>
                <button
                  className="min-h-11 rounded-lg border border-[#a3bd32] bg-[#171a14] px-4 text-sm font-bold text-[#e8edcf] transition-colors hover:border-[#c1d36a] hover:bg-[#718126] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a3bd32]"
                  onClick={copyDiscountCode}
                  type="button"
                >
                  {copyStatus === "copied" ? "Copied!" : "Copy code"}
                </button>
              </div>
              <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[#b8baae]">
                A copy of your discount code has been sent to your inbox for easy access anytime.
              </p>
              {copyStatus !== "idle" && (
                <p aria-live="polite" className="mt-2 text-sm text-[#b8baae]" role="status">
                  {copyStatus === "copied"
                    ? "Discount code copied."
                    : "Could not copy automatically. Select and copy the code above."}
                </p>
              )}
              <p className="mt-4 text-sm leading-7 text-[#55584e]">
                It is for your first order only and applies to the product subtotal, not shipping or
                tax. Online checkout is not yet available; include this code in your order inquiry
                and we will apply it manually.
              </p>
            </>
          )}
        </section>
      )}
      {result?.error && (
        <p aria-live="polite" className="mt-6 text-sm text-red-700" role="alert">
          {result.error}
        </p>
      )}
      {(!result?.ok || action === "confirm") && (
        <Link
          className="mx-auto mt-6 text-sm font-semibold text-olive underline"
          href="/"
          onClick={prepareResubscribe}
        >
          {result?.error ? "Sign up again" : "Return to Calypto"}
        </Link>
      )}
    </main>
  );
}
