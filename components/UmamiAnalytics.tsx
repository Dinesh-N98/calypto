"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getCookieConsent } from "@/lib/cookieConsent";

declare global {
  interface Window {
    umami?: {
      track: (event?: { url?: string }) => void;
    };
  }
}

export function UmamiAnalytics() {
  const pathname = usePathname();
  const websiteId = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID;
  const [scriptReady, setScriptReady] = useState(false);

  useEffect(() => {
    if (scriptReady && getCookieConsent()?.performance === true) {
      window.umami?.track({ url: window.location.href });
    }
  }, [pathname, scriptReady]);

  if (
    process.env.NODE_ENV !== "production" ||
    !websiteId ||
    pathname === "/admin" ||
    pathname.startsWith("/admin/")
  ) {
    return null;
  }

  return (
    <Script
      data-website-id={websiteId}
      data-auto-track="false"
      src="https://cloud.umami.is/script.js"
      strategy="afterInteractive"
      onReady={() => setScriptReady(true)}
    />
  );
}
