"use client";

import { Analytics } from "@vercel/analytics/next";

export function VercelAnalytics() {
  return (
    <Analytics
      beforeSend={(event) => {
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
