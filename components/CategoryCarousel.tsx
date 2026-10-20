"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

type CategoryCarouselItem = {
  name: string;
  slug: string;
  image: string | null;
};

const AUTO_ADVANCE_DELAY = 4500;
const INTERACTION_PAUSE_DELAY = 5000;

export function CategoryCarousel({ categories }: { categories: CategoryCarouselItem[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const interactionTimeoutRef = useRef<number | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [interactionPaused, setInteractionPaused] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  const scrollToCategory = useCallback(
    (index: number) => {
      const track = trackRef.current;
      const card = track?.children.item(index);
      if (!(card instanceof HTMLElement) || !track) return;
      const cardOffset = card.getBoundingClientRect().left - track.getBoundingClientRect().left;

      track.scrollTo({
        left: track.scrollLeft + cardOffset,
        behavior: prefersReducedMotion ? "auto" : "smooth",
      });
      setActiveIndex(index);
    },
    [prefersReducedMotion],
  );

  const pauseDuringInteraction = useCallback(() => {
    setInteractionPaused(true);
    if (interactionTimeoutRef.current !== null) {
      window.clearTimeout(interactionTimeoutRef.current);
      interactionTimeoutRef.current = null;
    }
  }, []);

  const pauseAfterInteraction = useCallback(() => {
    setInteractionPaused(true);
    if (interactionTimeoutRef.current !== null) {
      window.clearTimeout(interactionTimeoutRef.current);
    }
    interactionTimeoutRef.current = window.setTimeout(() => {
      setInteractionPaused(false);
      interactionTimeoutRef.current = null;
    }, INTERACTION_PAUSE_DELAY);
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setPrefersReducedMotion(mediaQuery.matches);
    updatePreference();
    mediaQuery.addEventListener("change", updatePreference);
    return () => mediaQuery.removeEventListener("change", updatePreference);
  }, []);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const observer = new IntersectionObserver(([entry]) => setIsVisible(entry.isIntersecting), {
      threshold: 0.1,
    });
    observer.observe(track);
    return () => observer.disconnect();
  }, []);

  useEffect(
    () => () => {
      if (interactionTimeoutRef.current !== null) {
        window.clearTimeout(interactionTimeoutRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    if (
      categories.length < 2 ||
      !isVisible ||
      isHovered ||
      isFocused ||
      interactionPaused ||
      prefersReducedMotion
    ) {
      return;
    }

    const timer = window.setInterval(() => {
      scrollToCategory((activeIndex + 1) % categories.length);
    }, AUTO_ADVANCE_DELAY);
    return () => window.clearInterval(timer);
  }, [
    activeIndex,
    categories.length,
    interactionPaused,
    isFocused,
    isHovered,
    isVisible,
    prefersReducedMotion,
    scrollToCategory,
  ]);

  function updateActiveIndex(track: HTMLDivElement) {
    let nearestIndex = 0;
    let nearestDistance = Number.POSITIVE_INFINITY;
    Array.from(track.children).forEach((child, index) => {
      if (!(child instanceof HTMLElement)) return;
      const distance = Math.abs(
        child.getBoundingClientRect().left - track.getBoundingClientRect().left,
      );
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = index;
      }
    });
    setActiveIndex(nearestIndex);
  }

  if (categories.length === 0) return null;

  return (
    <section
      aria-label="Shop by category"
      aria-roledescription="carousel"
      className="overflow-hidden bg-[#171a14] px-[7vw] py-12 text-paper md:px-[10vw] md:py-16"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocusCapture={() => setIsFocused(true)}
      onBlurCapture={(event) => {
        const nextTarget = event.relatedTarget;
        if (!(nextTarget instanceof Node) || !event.currentTarget.contains(nextTarget)) {
          setIsFocused(false);
        }
      }}
      onPointerDown={pauseDuringInteraction}
      onPointerUp={pauseAfterInteraction}
      onPointerCancel={pauseAfterInteraction}
      onWheel={pauseAfterInteraction}
      role="region"
    >
      <div className="site-container">
        <header className="mb-6 flex items-end justify-between gap-4 sm:mb-8">
          <div>
            <p className="text-[.62rem] font-bold uppercase tracking-[.16em] text-lime">
              Find your next favorite
            </p>
            <h2 className="mt-2 text-[clamp(2rem,6vw,3.25rem)] font-black uppercase leading-[.92] tracking-[-.07em]">
              Shop by category
            </h2>
          </div>
          {categories.length > 1 && (
            <div className="flex shrink-0 items-center gap-2">
              <button
                aria-label="Previous category"
                className="grid h-10 w-10 place-items-center rounded-full border border-white/20 transition-colors hover:border-lime hover:bg-lime hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime"
                onClick={() => {
                  pauseAfterInteraction();
                  scrollToCategory((activeIndex - 1 + categories.length) % categories.length);
                }}
                type="button"
              >
                <ArrowLeft aria-hidden="true" className="h-4 w-4" />
              </button>
              <button
                aria-label="Next category"
                className="grid h-10 w-10 place-items-center rounded-full border border-white/20 transition-colors hover:border-lime hover:bg-lime hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime"
                onClick={() => {
                  pauseAfterInteraction();
                  scrollToCategory((activeIndex + 1) % categories.length);
                }}
                type="button"
              >
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </button>
            </div>
          )}
        </header>

        <div
          aria-label="Category slides"
          className="scrollbar-none flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain scroll-smooth pb-2 motion-reduce:scroll-auto sm:gap-4"
          onScroll={(event) => updateActiveIndex(event.currentTarget)}
          ref={trackRef}
          role="group"
        >
          {categories.map((category) => (
            <Link
              aria-label={`Shop ${category.name}`}
              aria-roledescription="slide"
              className="group relative aspect-[4/3] w-[82%] shrink-0 snap-start overflow-hidden rounded-xl bg-[#292e23] shadow-lg sm:w-[54%] lg:w-[32%]"
              href={`/shop?category=${encodeURIComponent(category.slug)}`}
              key={category.slug}
              role="group"
            >
              {category.image && (
                <Image
                  alt=""
                  className="object-cover transition-transform duration-500 group-hover:scale-105 motion-reduce:transition-none"
                  fill
                  sizes="(max-width: 639px) 82vw, (max-width: 1023px) 54vw, 32vw"
                  src={category.image}
                  unoptimized
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-black/5 transition-colors duration-300 group-hover:from-black/90" />
              <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4 sm:p-5">
                <span className="text-lg font-black uppercase leading-tight tracking-[-.03em] text-white drop-shadow-md sm:text-2xl">
                  {category.name}
                </span>
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/50 bg-white/10 text-white backdrop-blur-sm transition-[background-color,color,transform] duration-300 group-hover:translate-x-0.5 group-hover:bg-lime group-hover:text-ink motion-reduce:transform-none">
                  <ArrowRight aria-hidden="true" className="h-4 w-4" />
                </span>
              </div>
            </Link>
          ))}
        </div>

        {categories.length > 1 && (
          <nav aria-label="Choose category" className="mt-5 flex justify-center gap-2">
            {categories.map((category, index) => (
              <button
                aria-label={`Go to category ${index + 1}: ${category.name}`}
                aria-current={activeIndex === index ? "true" : undefined}
                className={`h-2 rounded-full transition-[width,background-color] duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime motion-reduce:transition-none ${
                  activeIndex === index ? "w-7 bg-lime" : "w-2 bg-white/35 hover:bg-white/70"
                }`}
                key={category.slug}
                onClick={() => {
                  pauseAfterInteraction();
                  scrollToCategory(index);
                }}
                type="button"
              />
            ))}
          </nav>
        )}
      </div>
    </section>
  );
}
