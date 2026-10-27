"use client";

import Image from "next/image";
import popupAnglerImage from "../public/popup-angler.jpg";
import {
  ArrowRight,
  BadgeCheck,
  Fish,
  Gift,
  Leaf,
  LoaderCircle,
  Mail,
  X,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { getCookieConsent, subscribeCookieConsent } from "@/lib/cookieConsent";
import {
  getNewsletterPopupPreference,
  NEWSLETTER_POPUP_SUPPRESSION_MS,
  rememberNewsletterPopupPreference,
} from "@/lib/newsletter/popup-storage";
import { NEWSLETTER_CONSENT_TEXT, normalizeNewsletterEmail } from "@/lib/newsletter/subscriptions";

const DELAY_MS = 6000;
const HIDDEN_PATHS = ["/cart", "/checkout", "/sign-in", "/sign-up"];

type PopupState = "hidden" | "modal" | "badge";
type SubmissionStatus = "idle" | "loading" | "pending" | "error";

const perks: { icon: LucideIcon; label: string }[] = [
  { icon: Leaf, label: "Eco-friendly materials" },
  { icon: BadgeCheck, label: "Premium quality" },
  { icon: Fish, label: "Built for real anglers" },
];

export function NewsletterPopup() {
  const pathname = usePathname();
  const hidden = HIDDEN_PATHS.some((path) => pathname.startsWith(path));
  const [popupState, setPopupState] = useState<PopupState>("hidden");
  const [submissionStatus, setSubmissionStatus] = useState<SubmissionStatus>("idle");
  const [hasPendingReceipt, setHasPendingReceipt] = useState(false);
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const dialogRef = useRef<HTMLDivElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const badgeRef = useRef<HTMLButtonElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  const visible = popupState === "modal" && !hidden;

  useEffect(() => {
    let timer: number | undefined;
    const clearTimer = () => {
      if (timer !== undefined) {
        window.clearTimeout(timer);
        timer = undefined;
      }
    };
    const syncEligibility = () => {
      clearTimer();

      if (hidden) {
        setPopupState("hidden");
        return;
      }

      const consent = getCookieConsent();
      if (!consent || consent.targeting !== true) {
        setPopupState("hidden");
        return;
      }

      const stored = getNewsletterPopupPreference();
      if (stored?.status === "subscribed") {
        setPopupState("hidden");
        return;
      }

      if (hasPendingReceipt || popupState === "modal" || popupState === "badge") return;

      timer = window.setTimeout(() => {
        timer = undefined;
        const currentConsent = getCookieConsent();
        const latestStored = getNewsletterPopupPreference();

        if (hidden || currentConsent?.targeting !== true) return;
        if (latestStored?.status === "subscribed") {
          setPopupState("hidden");
        } else if (
          latestStored?.status === "pending" &&
          Date.now() - latestStored.at < NEWSLETTER_POPUP_SUPPRESSION_MS
        ) {
          setPopupState("hidden");
        } else if (latestStored?.status === "dismissed") {
          setPopupState("badge");
        } else {
          setPopupState("modal");
        }
      }, DELAY_MS);
    };

    syncEligibility();
    const unsubscribe = subscribeCookieConsent(syncEligibility);
    const onPreferenceChange = () => syncEligibility();
    window.addEventListener("calypto-newsletter-popup-change", onPreferenceChange);

    return () => {
      unsubscribe();
      window.removeEventListener("calypto-newsletter-popup-change", onPreferenceChange);
      clearTimer();
    };
  }, [hasPendingReceipt, hidden, pathname, popupState]);

  const close = useCallback(() => {
    if (!hasPendingReceipt) {
      rememberNewsletterPopupPreference("dismissed");
    }
    setPopupState("badge");
  }, [hasPendingReceipt]);

  useEffect(() => {
    if (!visible) {
      const returnTarget = returnFocusRef.current?.isConnected
        ? returnFocusRef.current
        : popupState === "badge"
          ? badgeRef.current
          : null;
      if (returnTarget) window.requestAnimationFrame(() => returnTarget.focus());
      return;
    }

    if (document.activeElement instanceof HTMLElement && document.activeElement !== document.body) {
      returnFocusRef.current = document.activeElement;
    }
    window.requestAnimationFrame(() => {
      (emailInputRef.current ?? dialogRef.current?.querySelector<HTMLButtonElement>("button"))
        ?.focus();
    });

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        close();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;

      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => !element.hasAttribute("aria-hidden"));
      if (!focusable.length) {
        event.preventDefault();
        dialogRef.current.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || !dialogRef.current.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !dialogRef.current.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [close, popupState, visible]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const normalizedEmail = normalizeNewsletterEmail(email);
    if (!normalizedEmail) {
      setSubmissionStatus("error");
      setError("Enter a valid email address and try again.");
      return;
    }
    setEmail(normalizedEmail);
    setSubmissionStatus("loading");

    const formData = new FormData(event.currentTarget);
    const website = String(formData.get("website") ?? "");

    try {
      const response = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail, website }),
        cache: "no-store",
      });

      if (!response.ok) {
        let body: { error?: string } | null = null;
        try {
          body = (await response.json()) as { error?: string };
        } catch {
          body = null;
        }
        setError(
          response.status === 429
            ? "Too many attempts. Please wait a few minutes before trying again."
            : response.status === 400
              ? body?.error || "Enter a valid email address and try again."
              : body?.error || "We couldn't send your confirmation email. Please try again.",
        );
        setSubmissionStatus("error");
        return;
      }

      setHasPendingReceipt(true);
      rememberNewsletterPopupPreference("pending");
      setSubmissionStatus("pending");
    } catch {
      setError("Network error. Check your connection and try again.");
      setSubmissionStatus("error");
    }
  }

  if (hidden || popupState === "hidden") return null;

  if (popupState === "badge") {
    return (
      <button
        ref={badgeRef}
        className="fixed bottom-5 left-5 z-[70] inline-flex items-center gap-2 rounded-full border border-lime/60 bg-ink px-4 py-3 text-sm font-extrabold text-paper shadow-2xl transition hover:-translate-y-0.5 hover:bg-[#171a13] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime motion-reduce:transform-none max-sm:h-10 max-sm:w-10 max-sm:justify-center max-sm:gap-0 max-sm:p-0"
        type="button"
        onClick={() => setPopupState("modal")}
        aria-label="Reopen newsletter offer: get 15% off"
      >
        <Gift aria-hidden="true" className="h-4 w-4 text-lime" />
        <span className="max-sm:sr-only">Get 15% OFF</span>
      </button>
    );
  }

  return (
    <div
      className="fixed inset-0 z-[70] grid place-items-center bg-black/60 p-4 animate-fade-in motion-reduce:animate-none"
      onClick={close}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="newsletter-title"
        tabIndex={-1}
        className="relative grid max-h-[calc(100dvh-2rem)] w-full max-w-[360px] overflow-y-auto border border-[rgba(241,240,232,.18)] bg-ink text-paper shadow-2xl md:max-w-[780px] md:grid-cols-2 animate-popup-up motion-reduce:animate-none"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          className="absolute right-1 top-1 z-10 grid h-11 w-11 place-items-center bg-transparent text-paper hover:text-lime focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime"
          type="button"
          onClick={close}
          aria-label="Close"
        >
          <X aria-hidden="true" className="h-7 w-7" strokeWidth={2} />
        </button>

        <div className="relative h-36 overflow-hidden bg-[#171a13] md:h-auto">
          <Image
            src={popupAnglerImage}
            alt="Angler holding a perch caught on a Calypto soft bait"
            fill
            loading="lazy"
            placeholder="blur"
            blurDataURL={popupAnglerImage.blurDataURL}
            sizes="(max-width: 767px) calc(100vw - 32px), 390px"
            className="object-cover object-[center_35%] md:object-[68%_center]"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-ink/40 to-ink md:bg-gradient-to-r md:from-transparent md:via-transparent md:to-ink/70" />
        </div>

        <div className="relative z-[1] -mt-5 flex flex-col items-center bg-gradient-to-b from-transparent via-ink/90 to-ink px-5 pb-5 pt-1 text-center md:mt-0 md:bg-none md:px-8 md:py-8">
          <p className="text-[1.6rem] font-black leading-none tracking-[.14em] md:text-[2rem]">
            calypto
          </p>
          <p className="mt-1.5 text-[.55rem] font-bold uppercase tracking-[.3em] text-muted">
            Handcrafted soft baits
          </p>

          <p className="mt-4 text-[.65rem] font-bold uppercase tracking-[.3em] md:mt-5">
            Join our crew
          </p>
          <h2
            id="newsletter-title"
            className="my-1 -skew-x-6 text-[3.25rem] font-black uppercase leading-[.85] tracking-[-.04em] md:text-[4.25rem]"
          >
            <span className="text-lime">15%</span> Off
          </h2>
          <p className="text-[.75rem] font-bold uppercase tracking-[.3em]">Your first order</p>

          <p className="mt-3 max-w-xs text-[.8rem] leading-[1.6] text-muted">
            Get exclusive offers, new designs and fishing tips straight to your inbox.
          </p>
          {submissionStatus === "pending" ? (
            <div aria-live="polite" className="mt-4 w-full text-sm leading-6 text-paper" role="status">
              <p className="font-bold">Check your inbox to confirm</p>
              <p className="mt-1 text-muted">
                We sent a confirmation link to <span className="font-semibold text-paper">{email}</span>.
                Confirm your email to receive your 15% code. Check your Spam or Promotions folder if
                it does not arrive shortly.
              </p>
            </div>
          ) : (
            <>
              <form className="mt-4 grid w-full gap-2.5" onSubmit={handleSubmit} noValidate>
                <label className="relative block">
                  <span className="sr-only">Your email address</span>
                  <Mail
                    aria-hidden="true"
                    className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-ink"
                    strokeWidth={2}
                  />
                  <input
                    ref={emailInputRef}
                    className="h-11 w-full bg-paper pl-11 pr-3 text-base text-ink outline-none placeholder:text-[#8a8d80] focus-visible:ring-2 focus-visible:ring-lime"
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="Your email address"
                    value={email}
                    onChange={(event) => {
                      setEmail(event.target.value);
                      if (submissionStatus === "error") setSubmissionStatus("idle");
                      setError("");
                    }}
                    aria-invalid={submissionStatus === "error"}
                    aria-describedby={error ? "newsletter-error" : "newsletter-consent"}
                  />
                </label>
                <div
                  aria-hidden="true"
                  className="absolute -left-[10000px] h-px w-px overflow-hidden"
                >
                  <label>
                    Leave this field empty
                    <input
                      name="website"
                      type="text"
                      autoComplete="off"
                      tabIndex={-1}
                    />
                  </label>
                </div>
                <button
                  className="inline-flex h-11 items-center justify-center gap-3 bg-lime px-5 text-[.8rem] font-extrabold uppercase tracking-[.08em] text-ink hover:bg-[#b6cf45] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime disabled:cursor-wait disabled:opacity-70"
                  type="submit"
                  disabled={submissionStatus === "loading"}
                  aria-busy={submissionStatus === "loading"}
                >
                  {submissionStatus === "loading" ? (
                    <>
                      <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      Get my 15% off
                      <ArrowRight aria-hidden="true" className="h-4 w-4" strokeWidth={2} />
                    </>
                  )}
                </button>
                <p id="newsletter-consent" className="text-[.68rem] leading-5 text-muted">
                  {NEWSLETTER_CONSENT_TEXT}{" "}
                  <Link className="underline underline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-lime" href="/privacy">
                    Privacy policy
                  </Link>
                </p>
                {error && (
                  <p id="newsletter-error" aria-live="polite" className="text-sm text-[#e89b87]" role="alert">
                    {error}
                  </p>
                )}
              </form>
              <p className="mt-2 text-[.7rem] text-muted">No spam. Unsubscribe anytime.</p>
            </>
          )}

          <ul className="mt-5 hidden w-full grid-cols-3 gap-2 border-t border-[rgba(241,240,232,.18)] pt-4 md:grid">
            {perks.map((perk) => (
              <li
                className="flex flex-col items-center gap-1.5 md:flex-row md:gap-2 md:text-left"
                key={perk.label}
              >
                <perk.icon aria-hidden="true" className="h-5 w-5 text-lime" strokeWidth={1.5} />
                <span className="text-[.52rem] font-bold uppercase leading-tight tracking-[.12em] text-muted md:text-[.55rem]">
                  {perk.label}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
