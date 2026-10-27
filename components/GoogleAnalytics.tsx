"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { buildGaPageUrl } from "@/lib/ga-url";

type Gtag = (...args: unknown[]) => void;

declare global {
  interface Window {
    dataLayer?: IArguments[];
    gtag?: Gtag;
    [key: `ga-disable-${string}`]: boolean;
  }
}

const measurementIdPattern = /^G-[A-Z0-9]+$/;

export function GoogleAnalytics() {
  const pathname = usePathname();
  const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  const debugEnabled = process.env.NEXT_PUBLIC_GA_DEBUG === "true";
  const isAdminPath = pathname === "/admin" || pathname.startsWith("/admin/");
  const [scriptReady, setScriptReady] = useState(false);
  const lastSentPathname = useRef<string | null>(null);

  useEffect(() => {
    if (!measurementId || !measurementIdPattern.test(measurementId) || isAdminPath) return;

    const disableKey = `ga-disable-${measurementId}` as const;
    window[disableKey] = false;
    window.dataLayer = window.dataLayer ?? [];
    window.gtag =
      window.gtag ??
      function gtag() {
        // gtag.js consumes queued calls as Arguments objects, not arrays.
        // eslint-disable-next-line prefer-rest-params
        window.dataLayer?.push(arguments);
      };

    window.gtag("consent", "update", {
      analytics_storage: "granted",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
    });
    window.gtag("js", new Date());
    window.gtag("config", measurementId, {
      send_page_view: false,
      ...(debugEnabled ? { debug_mode: true } : {}),
    });
    if (debugEnabled) console.debug("GA4 config sent.");

    return () => {
      window[disableKey] = true;
      window.gtag?.("consent", "update", { analytics_storage: "denied" });
    };
  }, [debugEnabled, isAdminPath, measurementId]);

  useEffect(() => {
    if (!scriptReady || !measurementId || isAdminPath) return;
    if (lastSentPathname.current === pathname) return;

    lastSentPathname.current = pathname;
    const { pagePath, pageLocation } = buildGaPageUrl(
      window.location.origin,
      pathname,
      window.location.search,
    );

    window.gtag?.("event", "page_view", {
      page_path: pagePath,
      page_location: pageLocation,
      page_title: document.title,
    });
    if (debugEnabled) console.debug("GA4 page_view sent.");
  }, [debugEnabled, isAdminPath, measurementId, pathname, scriptReady]);

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
