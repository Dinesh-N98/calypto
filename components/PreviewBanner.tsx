"use client";

import Link from "next/link";
import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const DISMISSED_STORAGE_KEY = "calypto-preview-banner-dismissed";

export function PreviewBanner() {
  const bannerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try {
        setIsVisible(window.sessionStorage.getItem(DISMISSED_STORAGE_KEY) !== "true");
      } catch (error) {
        console.error("Unable to read preview banner preference.", error);
        setIsVisible(true);
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!isVisible || !bannerRef.current) return;

    const banner = bannerRef.current;
    const updateHeight = () => {
      document.documentElement.style.setProperty(
        "--preview-banner-height",
        `${banner.getBoundingClientRect().height}px`,
      );
    };
    updateHeight();
    const observer =
      typeof ResizeObserver === "undefined" ? null : new ResizeObserver(updateHeight);
    if (observer) observer.observe(banner);
    else window.addEventListener("resize", updateHeight);

    return () => {
      observer?.disconnect();
      if (!observer) window.removeEventListener("resize", updateHeight);
      document.documentElement.style.setProperty("--preview-banner-height", "0px");
    };
  }, [isVisible]);

  function dismiss() {
    setIsVisible(false);
    try {
      window.sessionStorage.setItem(DISMISSED_STORAGE_KEY, "true");
    } catch (error) {
      console.error("Unable to save preview banner preference.", error);
    }
  }

  if (!isVisible) return null;

  return (
    <div
      className="sticky top-0 z-[60] border-b border-zinc-800 bg-zinc-900/95 text-zinc-100 shadow-sm backdrop-blur"
      ref={bannerRef}
    >
      <div className="mx-auto flex max-w-7xl items-start gap-2 px-4 py-2.5 sm:items-center sm:gap-3 sm:px-6 lg:px-8">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 text-xs font-normal leading-relaxed sm:flex-nowrap sm:gap-3 sm:text-sm">
          <span aria-hidden="true" className="relative flex h-2 w-2 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          <span className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2 gap-y-1">
            <strong className="font-semibold text-zinc-100">
              Calypto Sandbox Checkout
            </strong>
            <span className="text-zinc-400">
              Sandbox payment and DHL shipping testing are currently active.
            </span>
            <Link
              className="inline-flex min-h-7 shrink-0 items-center rounded-full bg-[#84cc16] px-3 py-1 text-xs font-semibold text-zinc-950 transition-all hover:bg-[#71b113] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#84cc16]/50"
              href="/wholesale#wholesale-inquiry"
            >
              Inquiries
            </Link>
          </span>
        </div>
        <button
          aria-label="Dismiss announcement"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-md p-1.5 text-zinc-400 transition-colors hover:bg-red-950/40 hover:text-red-400 focus-visible:bg-red-950/40 focus-visible:text-red-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-400"
          onClick={dismiss}
          type="button"
        >
          <X aria-hidden="true" className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
