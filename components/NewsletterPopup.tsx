"use client";

import Image from "next/image";
import popupAnglerImage from "../public/popup-angler.jpg";
import { ArrowRight, BadgeCheck, Fish, Gift, Leaf, Mail, X, type LucideIcon } from "lucide-react";
import { usePathname } from "next/navigation";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { getCookieConsent, subscribeCookieConsent } from "@/lib/cookieConsent";

const STORAGE_KEY = "calypto-newsletter-popup";
const DISMISS_DAYS = 7;
const DISMISS_MS = DISMISS_DAYS * 24 * 60 * 60 * 1000;
const DELAY_MS = 6000;
const HIDDEN_PATHS = ["/cart", "/checkout", "/sign-in", "/sign-up"];

type Stored = { status: "dismissed" | "subscribed"; at: number };
type PopupState = "hidden" | "modal" | "badge" | "subscribed";

function parseStored(raw: string | null): Stored | null {
  if (raw === null) return null;

  try {
    const value: unknown = JSON.parse(raw);
    if (
      typeof value !== "object" ||
      value === null ||
      !("status" in value) ||
      (value.status !== "dismissed" && value.status !== "subscribed") ||
      !("at" in value) ||
      typeof value.at !== "number" ||
      !Number.isFinite(value.at) ||
      value.at < 0
    ) {
      return null;
    }

    return { status: value.status, at: value.at };
  } catch {
    return null;
  }
}

function getStored(): Stored | null {
  try {
    return parseStored(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    return null;
  }
}

function remember(status: Stored["status"]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ status, at: Date.now() }));
  } catch {
    // Storage may be unavailable; the current UI state still updates.
  }
}

const perks: { icon: LucideIcon; label: string }[] = [
  { icon: Leaf, label: "Eco-friendly materials" },
  { icon: BadgeCheck, label: "Premium quality" },
  { icon: Fish, label: "Built for real anglers" },
];

export function NewsletterPopup() {
  const pathname = usePathname();
  const hidden = HIDDEN_PATHS.some((path) => pathname.startsWith(path));
  const [popupState, setPopupState] = useState<PopupState>("hidden");
  const [submissionStatus, setSubmissionStatus] = useState<"idle" | "submitting">("idle");
  const [error, setError] = useState("");

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
        setPopupState((current) => (current === "subscribed" ? current : "hidden"));
        return;
      }

      const consent = getCookieConsent();
      if (!consent || consent.targeting !== true) {
        setPopupState((current) => (current === "subscribed" ? current : "hidden"));
        return;
      }

      const stored = getStored();
      if (stored?.status === "subscribed") {
        setPopupState("subscribed");
        return;
      }

      if (popupState === "modal" || popupState === "badge") return;

      timer = window.setTimeout(() => {
        timer = undefined;
        const currentConsent = getCookieConsent();
        const latestStored = getStored();
        const latestDismissalAge =
          latestStored?.status === "dismissed" ? Date.now() - latestStored.at : null;
        const dismissedRecently =
          latestDismissalAge !== null &&
          latestDismissalAge >= 0 &&
          latestDismissalAge < DISMISS_MS;

        if (hidden || currentConsent?.targeting !== true) return;
        if (latestStored?.status === "subscribed") {
          setPopupState("subscribed");
        } else if (dismissedRecently) {
          setPopupState("badge");
        } else {
          setPopupState("modal");
        }
      }, DELAY_MS);
    };

    syncEligibility();
    const unsubscribe = subscribeCookieConsent(syncEligibility);

    return () => {
      unsubscribe();
      clearTimer();
    };
  }, [hidden, pathname, popupState]);

  const close = useCallback(() => {
    remember("dismissed");
    setPopupState("badge");
  }, []);

  useEffect(() => {
    if (!visible) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };

    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [close, visible]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmissionStatus("submitting");

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "")
      .toLowerCase()
      .trim();

    try {
      const response = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        setError(body?.error || "Something went wrong. Please try again.");
        setSubmissionStatus("idle");
        return;
      }

      remember("subscribed");
      setSubmissionStatus("idle");
      setPopupState("subscribed");
    } catch {
      setError("Something went wrong. Please try again.");
      setSubmissionStatus("idle");
    }
  }

  if (hidden || popupState === "hidden" || popupState === "subscribed") return null;

  if (popupState === "badge") {
    return (
      <button
        className="fixed bottom-5 left-5 z-[70] inline-flex items-center gap-2 rounded-full border border-lime/60 bg-ink px-4 py-3 text-sm font-extrabold text-paper shadow-2xl transition hover:-translate-y-0.5 hover:bg-[#171a13] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime motion-reduce:transform-none"
        type="button"
        onClick={() => setPopupState("modal")}
        aria-label="Reopen newsletter offer: get 15% off"
      >
        <Gift aria-hidden="true" className="h-4 w-4 text-lime" />
        Get 15% OFF
      </button>
    );
  }

  return (
    <div
      className="fixed inset-0 z-[70] grid place-items-center bg-black/60 p-4 animate-fade-in motion-reduce:animate-none"
      onClick={close}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="newsletter-title"
        className="relative grid max-h-[calc(100dvh-2rem)] w-full max-w-[360px] overflow-y-auto border border-[rgba(241,240,232,.18)] bg-ink text-paper shadow-2xl md:max-w-[780px] md:grid-cols-2 animate-popup-up motion-reduce:animate-none"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          className="absolute right-1 top-1 z-10 grid h-11 w-11 place-items-center bg-transparent text-paper hover:text-lime"
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
          <form className="mt-4 grid w-full gap-2.5" onSubmit={handleSubmit} noValidate>
            <label className="relative block">
              <span className="sr-only">Your email address</span>
              <Mail
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-ink"
                strokeWidth={2}
              />
              <input
                className="h-11 w-full bg-paper pl-11 pr-3 text-base text-ink outline-none placeholder:text-[#8a8d80] focus:ring-2 focus:ring-lime"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="Your email address"
              />
            </label>
            <button
              className="inline-flex h-11 items-center justify-center gap-3 bg-lime px-5 text-[.8rem] font-extrabold uppercase tracking-[.08em] text-ink hover:bg-[#b6cf45]"
              type="submit"
              disabled={submissionStatus === "submitting"}
            >
              {submissionStatus === "submitting" ? "Sending..." : "Get my 15% off"}
              <ArrowRight aria-hidden="true" className="h-4 w-4" strokeWidth={2} />
            </button>
            {error && (
              <p className="text-sm text-[#e89b87]" role="alert">
                {error}
              </p>
            )}
          </form>
          <p className="mt-2 text-[.7rem] text-muted">No spam. Unsubscribe anytime.</p>

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
