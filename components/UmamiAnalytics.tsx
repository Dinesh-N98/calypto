"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";

export function UmamiAnalytics() {
  const pathname = usePathname();
  const websiteId = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID;

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
      src="https://cloud.umami.is/script.js"
      strategy="afterInteractive"
    />
  );
}
