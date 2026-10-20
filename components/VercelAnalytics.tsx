"use client";

import { Analytics } from "@vercel/analytics/next";
import { getCookieConsent } from "@/lib/cookieConsent";

export function VercelAnalytics() {
  return (
    <Analytics
      beforeSend={(event) => {
        if (getCookieConsent()?.performance !== true) return null;

        try {
          const pathname = new URL(event.url, "https://www.calyptobait.com").pathname;
          if (pathname === "/admin" || pathname.startsWith("/admin/")) return null;
          return event;
        } catch {
          return null;
        }
      }}
    />
  );
}
