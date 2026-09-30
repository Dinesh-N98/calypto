"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { FormEvent, useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "calypto-newsletter-popup";
const DISMISS_DAYS = 7;
const DELAY_MS = 3000;
const HIDDEN_PATHS = ["/cart", "/checkout", "/sign-in", "/sign-up"];
const DISCOUNT_CODE = "CALYPTO15";

type Stored = { status: "dismissed" | "subscribed"; at: number };

function shouldShow(): boolean {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return true;

    const stored = JSON.parse(raw) as Stored;
    if (stored.status === "subscribed") return false;

    return Date.now() - stored.at > DISMISS_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return true;
  }
}

function remember(status: Stored["status"]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ status, at: Date.now() }));
  } catch {
    // storage unavailable (private mode) – popup may reappear, that's acceptable
  }
}

const perks = [
  { icon: "◈", label: "Eco-friendly materials" },
  { icon: "◇", label: "Premium quality" },
  { icon: "↗", label: "Built for real anglers" },
];

export function NewsletterPopup() {
  const pathname = usePathname();
  const hidden = HIDDEN_PATHS.some((path) => pathname.startsWith(path));
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<"idle" | "submitting" | "success">("idle");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const visible = open && !hidden;

  useEffect(() => {
    if (hidden) return;

    const timer = window.setTimeout(() => {
      if (shouldShow()) setOpen(true);
    }, DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [hidden]);

  const close = useCallback(() => {
    if (status !== "success") remember("dismissed");
    setOpen(false);
  }, [status]);

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
    setStatus("submitting");

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").toLowerCase().trim();

    try {
      const response = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        setError(body?.error || "Something went wrong. Please try again.");
        setStatus("idle");
        return;
      }

      remember("subscribed");
      setStatus("success");
    } catch {
      setError("Something went wrong. Please try again.");
      setStatus("idle");
    }
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(DISCOUNT_CODE);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard blocked – code is still visible to copy manually
    }
  }

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[70] grid place-items-center bg-black/75 p-3 backdrop-blur-sm sm:p-6"
      onClick={close}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="newsletter-title"
        className="relative grid max-h-[calc(100dvh-1.5rem)] w-full max-w-[920px] overflow-y-auto border border-[rgba(241,240,232,.18)] bg-ink text-paper shadow-2xl md:grid-cols-[1.05fr_1fr]"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          className="absolute right-1 top-1 z-10 grid h-11 w-11 place-items-center bg-transparent text-3xl leading-none text-paper hover:text-lime"
          type="button"
          onClick={close}
          aria-label="Close"
        >
          ×
        </button>

        <div className="relative h-44 md:h-auto md:min-h-[540px]">
          <Image
            src="/popup-angler.jpg"
            alt="Angler holding a perch caught on a Calypto soft bait"
            fill
            priority
            sizes="(max-width: 767px) 100vw, 460px"
            className="object-cover object-[30%_center]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink via-transparent to-transparent md:bg-gradient-to-r md:from-transparent md:via-transparent md:to-ink/70" />
        </div>

        <div className="flex flex-col items-center px-6 pb-6 pt-2 text-center md:px-10 md:py-12">
          <p className="text-[2rem] font-black leading-none tracking-[.14em] md:text-[2.4rem]">
            calypto
          </p>
          <p className="mt-2 text-[.55rem] font-bold uppercase tracking-[.3em] text-muted">
            Handcrafted soft baits
          </p>

          <p className="mt-6 text-[.7rem] font-bold uppercase tracking-[.3em]">Join our crew</p>
          <h2
            id="newsletter-title"
            className="my-2 -skew-x-6 text-[4.5rem] font-black uppercase leading-[.85] tracking-[-.04em] md:text-[6rem]"
          >
            <span className="text-lime">15%</span> Off
          </h2>
          <p className="text-[.75rem] font-bold uppercase tracking-[.3em]">Your first order</p>

          {status === "success" ? (
            <div className="mt-7 w-full">
              <p className="text-xl font-black uppercase tracking-[-.02em]">You&apos;re in.</p>
              <p className="mt-2 text-sm leading-[1.6] text-muted">
                Use this code at checkout for 15% off your first order.
              </p>
              <div className="mt-4 flex items-stretch border border-lime">
                <span className="flex-1 px-4 py-3 text-lg font-black tracking-[.2em] text-lime">
                  {DISCOUNT_CODE}
                </span>
                <button
                  className="bg-lime px-4 text-[.65rem] font-extrabold uppercase tracking-[.1em] text-ink"
                  type="button"
                  onClick={copyCode}
                >
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
              <button
                className="mt-5 text-[.7rem] font-extrabold uppercase tracking-[.12em] text-lime underline"
                type="button"
                onClick={close}
              >
                Start shopping
              </button>
            </div>
          ) : (
            <>
              <p className="mt-5 max-w-xs text-sm leading-[1.6] text-muted">
                Get exclusive offers, new designs and fishing tips straight to your inbox.
              </p>
              <form className="mt-5 grid w-full gap-3" onSubmit={handleSubmit} noValidate>
                <label className="relative block">
                  <span className="sr-only">Your email address</span>
                  <svg
                    className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-ink"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <rect x="3" y="5" width="18" height="14" rx="1" />
                    <path d="m3 7 9 6 9-6" />
                  </svg>
                  <input
                    className="h-12 w-full bg-paper pl-11 pr-3 text-base text-ink outline-none placeholder:text-[#8a8d80] focus:ring-2 focus:ring-lime"
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="Your email address"
                  />
                </label>
                <button
                  className="inline-flex h-12 items-center justify-center gap-3 bg-lime px-5 text-[.8rem] font-extrabold uppercase tracking-[.08em] text-ink hover:bg-[#b6cf45]"
                  type="submit"
                  disabled={status === "submitting"}
                >
                  {status === "submitting" ? "Sending..." : "Get my 15% off"}
                  <span aria-hidden="true">→</span>
                </button>
                {error && (
                  <p className="text-sm text-[#e89b87]" role="alert">
                    {error}
                  </p>
                )}
              </form>
              <p className="mt-3 text-[.7rem] text-muted">No spam. Unsubscribe anytime.</p>
            </>
          )}

          <ul className="mt-6 grid w-full grid-cols-3 gap-2 border-t border-[rgba(241,240,232,.18)] pt-5">
            {perks.map((perk) => (
              <li className="flex flex-col items-center gap-1.5 md:flex-row md:gap-2 md:text-left" key={perk.label}>
                <span className="text-lg text-lime" aria-hidden="true">
                  {perk.icon}
                </span>
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
