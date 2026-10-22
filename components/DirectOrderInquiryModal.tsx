"use client";

import Link from "next/link";
import { ArrowUpRight, X } from "lucide-react";
import { useEffect, useRef } from "react";

export function DirectOrderInquiryModal({ onClose }: { onClose: () => void }) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[80] grid place-items-center overflow-y-auto bg-black/75 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        aria-labelledby="direct-order-inquiry-title"
        aria-modal="true"
        className="relative my-auto w-full max-w-lg border border-zinc-700 bg-zinc-950 p-6 text-zinc-100 shadow-2xl sm:p-8"
        ref={dialogRef}
        role="dialog"
        tabIndex={-1}
      >
        <button
          aria-label="Close inquiry dialog"
          className="absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-md text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#84cc16]"
          onClick={onClose}
          type="button"
        >
          <X aria-hidden="true" className="h-5 w-5" />
        </button>
        <p className="text-xs font-bold uppercase tracking-[.16em] text-[#84cc16]">
          Calypto preview release
        </p>
        <h2
          className="mt-3 pr-8 text-2xl font-black tracking-tight text-white sm:text-3xl"
          id="direct-order-inquiry-title"
        >
          Direct Order Inquiry
        </h2>
        <p className="mt-4 text-sm leading-7 text-zinc-300">
          We are currently finalizing our automated payment &amp; shipping integrations. Submit your
          order request directly, and our team will contact you instantly to finalize delivery.
        </p>
        <div className="mt-7 grid gap-3 sm:grid-cols-2">
          <Link
            className="inline-flex min-h-12 items-center justify-center gap-2 bg-[#84cc16] px-4 text-center text-sm font-bold text-zinc-950 transition-colors hover:bg-lime-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#84cc16]"
            href="/contact"
            onClick={onClose}
          >
            Send Inquiry via Form
            <ArrowUpRight aria-hidden="true" className="h-4 w-4 shrink-0" />
          </Link>
          <button
            className="inline-flex min-h-12 items-center justify-center border border-zinc-600 px-4 text-sm font-bold text-zinc-100 transition-colors hover:border-zinc-400 hover:bg-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#84cc16]"
            onClick={onClose}
            type="button"
          >
            Continue Browsing
          </button>
        </div>
      </div>
    </div>
  );
}
