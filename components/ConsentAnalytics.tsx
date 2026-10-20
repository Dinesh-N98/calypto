"use client";

import { useEffect, useState } from "react";
import { GoogleAnalytics } from "@/components/GoogleAnalytics";
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

  return <GoogleAnalytics />;
}
