// @vitest-environment jsdom

import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CategoryCarousel } from "@/components/CategoryCarousel";

const categories = [
  { name: "Worm Baits", slug: "worm-baits", image: null },
  { name: "Swimbaits", slug: "swimbaits", image: null },
  { name: "Jigs", slug: "jigs", image: null },
];

const originalScrollTo = HTMLElement.prototype.scrollTo;

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
  vi.stubGlobal(
    "IntersectionObserver",
    class implements IntersectionObserver {
      readonly root: Element | null = null;
      readonly rootMargin = "";
      readonly thresholds: readonly number[] = [];

      constructor(private readonly callback: IntersectionObserverCallback) {}

      observe(target: Element) {
        const bounds = target.getBoundingClientRect();
        const entry: IntersectionObserverEntry = {
          boundingClientRect: bounds,
          intersectionRatio: 1,
          intersectionRect: bounds,
          isIntersecting: true,
          rootBounds: null,
          target,
          time: 0,
        };
        this.callback([entry], this);
      }

      disconnect() {}

      unobserve() {}

      takeRecords(): IntersectionObserverEntry[] {
        return [];
      }
    },
  );
  Object.defineProperty(HTMLElement.prototype, "scrollTo", {
    configurable: true,
    value: vi.fn(),
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  if (originalScrollTo) {
    Object.defineProperty(HTMLElement.prototype, "scrollTo", {
      configurable: true,
      value: originalScrollTo,
    });
  } else {
    delete (HTMLElement.prototype as Partial<HTMLElement>).scrollTo;
  }
});

describe("CategoryCarousel", () => {
  it("auto-advances categories while visible", () => {
    render(<CategoryCarousel categories={categories} />);

    act(() => {
      vi.advanceTimersByTime(4500);
    });

    expect(screen.getByRole("button", { name: "Go to category 2: Swimbaits" })).toHaveAttribute(
      "aria-current",
      "true",
    );
  });

  it("pauses auto-advance while hovered", () => {
    render(<CategoryCarousel categories={categories} />);
    fireEvent.mouseEnter(screen.getByRole("region", { name: "Shop by category" }));

    act(() => {
      vi.advanceTimersByTime(4500);
    });

    expect(screen.getByRole("button", { name: "Go to category 1: Worm Baits" })).toHaveAttribute(
      "aria-current",
      "true",
    );
  });

  it("does not auto-advance for reduced motion and keeps manual navigation available", () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => ({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    );
    render(<CategoryCarousel categories={categories} />);

    act(() => {
      vi.advanceTimersByTime(4500);
    });
    expect(screen.getByRole("button", { name: "Go to category 1: Worm Baits" })).toHaveAttribute(
      "aria-current",
      "true",
    );

    fireEvent.click(screen.getByRole("button", { name: "Next category" }));
    expect(screen.getByRole("button", { name: "Go to category 2: Swimbaits" })).toHaveAttribute(
      "aria-current",
      "true",
    );
    expect(HTMLElement.prototype.scrollTo).toHaveBeenLastCalledWith(
      expect.objectContaining({ behavior: "auto" }),
    );
  });
});
