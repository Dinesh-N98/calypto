"use client";

import Image from "next/image";
import Link from "next/link";
import type { Promotion } from "@prisma/client";
import { ArrowLeft, ArrowRight, ArrowUpRight, Check, Copy, Tag } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useToast } from "@/components/ToastProvider";

function getDiscountLabel(promotion: Promotion): string | null {
  if (promotion.discountType === "fixed" && promotion.discountAmountCents) {
    return `$${(promotion.discountAmountCents / 100).toFixed(2)} off`;
  }
  if (promotion.discountPercent) return `${promotion.discountPercent}% off`;
  return null;
}

function formatEndDate(value: Date): string {
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(value);
}

function PromotionCard({ promotion }: { promotion: Promotion }) {
  const { showToast } = useToast();
  const [copied, setCopied] = useState(false);
  const copiedTimerRef = useRef<number | null>(null);
  const discountLabel = getDiscountLabel(promotion);
  const isLimitedTime = promotion.endDate !== null;

  useEffect(
    () => () => {
      if (copiedTimerRef.current !== null) window.clearTimeout(copiedTimerRef.current);
    },
    [],
  );

  async function copyCode() {
    if (!promotion.discountCode) return;

    try {
      await navigator.clipboard.writeText(promotion.discountCode);
      setCopied(true);
      showToast("Promotion code copied.");
      if (copiedTimerRef.current !== null) window.clearTimeout(copiedTimerRef.current);
      copiedTimerRef.current = window.setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast("Could not copy the promotion code. Please copy it manually.", "error");
    }
  }

  return (
    <article className="grid min-h-[22rem] overflow-hidden rounded-2xl bg-[#f1f0e8] text-[#171a14] shadow-[0_20px_60px_rgba(0,0,0,.24)] md:min-h-[25rem] md:grid-cols-[minmax(0,1.05fr)_minmax(0,.95fr)]">
      <div className="relative min-h-56 overflow-hidden bg-[#262b20] md:min-h-full">
        <Image
          alt={promotion.title}
          className="object-cover transition-transform duration-700 ease-out motion-safe:hover:scale-[1.035] motion-reduce:transition-none"
          fill
          sizes="(min-width: 768px) 45vw, 100vw"
          src={promotion.imageUrl}
          unoptimized
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent md:bg-gradient-to-r md:from-transparent md:to-black/10" />
        {discountLabel && (
          <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-[#a3bd32] px-3 py-1.5 text-[.68rem] font-extrabold uppercase tracking-[.08em] text-[#171a14] shadow-md md:left-6 md:top-6">
            <Tag aria-hidden="true" className="h-3.5 w-3.5" />
            {discountLabel}
          </span>
        )}
      </div>

      <div className="flex flex-col justify-center p-5 sm:p-7 md:p-9 lg:p-12">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="inline-flex items-center gap-2 text-[.65rem] font-extrabold uppercase tracking-[.14em] text-[#53641d]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#718126]" />
            {isLimitedTime ? "Limited time" : discountLabel ? "Active discount" : "Featured offer"}
          </span>
          {promotion.endDate && (
            <span className="text-xs font-medium text-[#62665b]">
              Ends {formatEndDate(promotion.endDate)}
            </span>
          )}
        </div>

        <h3 className="mt-4 text-2xl font-black uppercase leading-[1.02] tracking-[-.045em] sm:text-3xl lg:text-4xl">
          {promotion.title}
        </h3>
        <p className="mt-3 max-w-xl text-sm leading-6 text-[#51554b] sm:text-[.95rem] sm:leading-7">
          {promotion.description}
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          {promotion.discountCode && (
            <button
              aria-label={`${copied ? "Copied" : "Copy"} promotion code ${promotion.discountCode}`}
              className="group/code inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#b8baae] bg-white px-3.5 text-xs font-extrabold uppercase tracking-[.09em] text-[#262a21] transition-colors hover:border-[#65771b] hover:bg-[#f8faef] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#65771b]"
              onClick={copyCode}
              type="button"
            >
              <span>{promotion.discountCode}</span>
              {copied ? (
                <Check aria-hidden="true" className="h-4 w-4 text-[#53641d]" />
              ) : (
                <Copy
                  aria-hidden="true"
                  className="h-3.5 w-3.5 text-[#73786b] transition-transform group-hover/code:scale-110"
                />
              )}
              <span className="sr-only">{copied ? "Copied" : "Copy code"}</span>
            </button>
          )}

          <Link
            className="group/cta inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#171a14] px-5 text-xs font-extrabold uppercase tracking-[.09em] text-white transition-[background-color,transform] duration-200 hover:-translate-y-0.5 hover:bg-[#53641d] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#65771b] motion-reduce:transform-none motion-reduce:transition-none"
            href="/shop"
          >
            Shop now
            <ArrowUpRight
              aria-hidden="true"
              className="h-4 w-4 transition-transform duration-200 group-hover/cta:translate-x-0.5 group-hover/cta:-translate-y-0.5 motion-reduce:transform-none"
            />
          </Link>
        </div>
      </div>
    </article>
  );
}

export function PromotionSection({ promotions }: { promotions: Promotion[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  if (promotions.length === 0) return null;

  function scrollToSlide(index: number) {
    const track = trackRef.current;
    if (!track) return;
    const nextIndex = Math.max(0, Math.min(index, promotions.length - 1));
    track.scrollTo({ left: nextIndex * track.clientWidth, behavior: "smooth" });
    setActiveIndex(nextIndex);
  }

  return (
    <section
      aria-label="Current promotions"
      aria-roledescription={promotions.length > 1 ? "carousel" : undefined}
      className="overflow-hidden bg-[#171a14] px-4 py-12 sm:px-6 md:px-[7vw] md:py-16 lg:py-20"
      role="region"
    >
      <div className="site-container">
        <header className="mb-5 flex items-end justify-between gap-4 sm:mb-7">
          <div>
            <p className="text-[.62rem] font-bold uppercase tracking-[.16em] text-lime">
              Offers made for the next cast
            </p>
            <h2 className="mt-2 text-xl font-black uppercase tracking-[-.035em] text-paper sm:text-2xl">
              Limited-time offers
            </h2>
          </div>
          {promotions.length > 1 && (
            <div className="hidden items-center gap-2 sm:flex">
              <button
                aria-label="Previous promotion"
                className="grid h-10 w-10 place-items-center rounded-full border border-white/20 text-white transition-colors hover:border-lime hover:bg-lime hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime disabled:opacity-40"
                disabled={activeIndex === 0}
                onClick={() => scrollToSlide(activeIndex - 1)}
                type="button"
              >
                <ArrowLeft aria-hidden="true" className="h-4 w-4" />
              </button>
              <button
                aria-label="Next promotion"
                className="grid h-10 w-10 place-items-center rounded-full border border-white/20 text-white transition-colors hover:border-lime hover:bg-lime hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime disabled:opacity-40"
                disabled={activeIndex === promotions.length - 1}
                onClick={() => scrollToSlide(activeIndex + 1)}
                type="button"
              >
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </button>
            </div>
          )}
        </header>

        <div
          className="scrollbar-none flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain scroll-smooth"
          onScroll={(event) => {
            const track = event.currentTarget;
            if (track.clientWidth > 0) {
              setActiveIndex(Math.round(track.scrollLeft / track.clientWidth));
            }
          }}
          ref={trackRef}
          role={promotions.length > 1 ? "group" : undefined}
          aria-label={promotions.length > 1 ? "Promotion slides" : undefined}
        >
          {promotions.map((promotion, index) => (
            <div
              aria-label={`${index + 1} of ${promotions.length}: ${promotion.title}`}
              aria-roledescription={promotions.length > 1 ? "slide" : undefined}
              className="w-full shrink-0 snap-start"
              key={promotion.id}
              role={promotions.length > 1 ? "group" : undefined}
            >
              <PromotionCard promotion={promotion} />
            </div>
          ))}
        </div>

        {promotions.length > 1 && (
          <nav
            aria-label="Choose promotion"
            className="mt-5 flex items-center justify-center gap-2"
          >
            {promotions.map((promotion, index) => (
              <button
                aria-current={activeIndex === index ? "true" : undefined}
                aria-label={`Go to promotion ${index + 1}: ${promotion.title}`}
                className={`h-2 rounded-full transition-[width,background-color] duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime motion-reduce:transition-none ${
                  activeIndex === index ? "w-7 bg-lime" : "w-2 bg-white/35 hover:bg-white/70"
                }`}
                key={promotion.id}
                onClick={() => scrollToSlide(index)}
                type="button"
              />
            ))}
          </nav>
        )}
      </div>
    </section>
  );
}
