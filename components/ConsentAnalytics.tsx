"use client";

import { useEffect, useState } from "react";
import { UmamiAnalytics } from "@/components/UmamiAnalytics";
import { VercelAnalytics } from "@/components/VercelAnalytics";
import { getCookieConsent, subscribeCookieConsent } from "@/lib/cookieConsent";

export function ConsentAnalytics() {
  const [performanceConsent, setPerformanceConsent] = useState(false);

  useEffect(() => {
    const syncConsent = () => {
      setPerformanceConsent(getCookieConsent()?.performance === true);
    };

    syncConsent();
    return subscribeCookieConsent(syncConsent);
  }, []);

  if (!performanceConsent) return null;

  return (
    <>
      <UmamiAnalytics />
      {process.env.NODE_ENV === "production" && <VercelAnalytics />}
    </>
  );
}
