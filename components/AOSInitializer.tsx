"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

type AOSInstance = typeof import("aos");

export function AOSInitializer() {
  const pathname = usePathname();
  const aos = useRef<AOSInstance | null>(null);

  useEffect(() => {
    let cancelled = false;

    void import("aos").then(({ default: AOS }) => {
      if (cancelled) return;

      if (!aos.current) {
        AOS.init({
          duration: 700,
          easing: "ease-out-cubic",
          once: true,
          offset: 80,
          disable: () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
        });
        aos.current = AOS;
      } else {
        AOS.refreshHard();
      }
    });

    return () => {
      cancelled = true;
    };
  }, [pathname]);

  return null;
}
