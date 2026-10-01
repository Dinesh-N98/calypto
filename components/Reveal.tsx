"use client";

import { useEffect, useState, type ReactNode } from "react";

type RevealProps = {
  children: ReactNode;
  as?: "div" | "section" | "li" | "article";
  delay?: number;
  direction?: "up" | "left" | "right" | "none";
  className?: string;
};

const hiddenTransforms = {
  up: "translate-y-8",
  left: "-translate-x-8",
  right: "translate-x-8",
  none: "translate-x-0 translate-y-0",
};

export function Reveal({
  children,
  as = "div",
  delay = 0,
  direction = "up",
  className = "",
}: RevealProps) {
  const [element, setElement] = useState<HTMLElement | null>(null);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (!element) return;

    if (
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      !("IntersectionObserver" in window)
    ) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        setIsVisible(entry.isIntersecting);

        if (entry.isIntersecting) {
          observer.disconnect();
          window.clearTimeout(fallbackTimer);
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -10% 0px" },
    );
    const fallbackTimer = window.setTimeout(() => {
      setIsVisible(true);
      observer.disconnect();
    }, 5000);
    observer.observe(element);

    return () => {
      observer.disconnect();
      window.clearTimeout(fallbackTimer);
    };
  }, [element]);

  const hiddenTransform = hiddenTransforms[direction];
  const visibilityClasses = isVisible
    ? "translate-x-0 translate-y-0 opacity-100"
    : `opacity-0 ${hiddenTransform}`;

  const Element = as;
  return (
    <Element
      ref={setElement}
      className={`${className} ${visibilityClasses} transition-[opacity,transform] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:translate-x-0 motion-reduce:translate-y-0 motion-reduce:opacity-100 motion-reduce:transition-none`.trim()}
      data-visible={isVisible}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </Element>
  );
}
