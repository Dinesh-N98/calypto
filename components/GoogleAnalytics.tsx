"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type Gtag = (...args: unknown[]) => void;

declare global {
  interface Window {
    dataLayer?: unknown[][];
    gtag?: Gtag;
    [key: `ga-disable-${string}`]: boolean;
  }
}

const measurementIdPattern = /^G-[A-Z0-9]+$/;

export function GoogleAnalytics() {
  const pathname = usePathname();
  const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  const isAdminPath = pathname === "/admin" || pathname.startsWith("/admin/");
  const [scriptReady, setScriptReady] = useState(false);

  useEffect(() => {
    if (!measurementId || !measurementIdPattern.test(measurementId) || isAdminPath) return;

    const disableKey = `ga-disable-${measurementId}` as const;
    window[disableKey] = false;
    window.dataLayer = window.dataLayer ?? [];
    window.gtag =
      window.gtag ??
      ((...args: unknown[]) => {
        window.dataLayer?.push(args);
      });

    window.gtag("consent", "update", {
      analytics_storage: "granted",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
    });
    window.gtag("js", new Date());
    window.gtag("config", measurementId, { send_page_view: false });

    return () => {
      window[disableKey] = true;
      window.gtag?.("consent", "update", { analytics_storage: "denied" });
    };
  }, [isAdminPath, measurementId]);

  useEffect(() => {
    if (!scriptReady || !measurementId || isAdminPath) return;

    window.gtag?.("event", "page_view", {
      page_path: `${pathname}${window.location.search}`,
      page_location: window.location.href,
    });
  }, [isAdminPath, measurementId, pathname, scriptReady]);

  if (
    !measurementId ||
    !measurementIdPattern.test(measurementId) ||
    isAdminPath
  ) {
    return null;
  }

  return (
    <Script
      id="google-analytics"
      src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`}
      strategy="afterInteractive"
      onReady={() => setScriptReady(true)}
      onError={(error) => {
        console.error("Unable to load the Google Analytics script.", error);
      }}
    />
  );
}
