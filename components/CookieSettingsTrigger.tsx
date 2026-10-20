"use client";

import { requestCookieSettings } from "@/lib/cookieConsent";

export function CookieSettingsTrigger() {
  return (
    <button
      className="self-start text-left text-[.75rem] text-muted underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime"
      type="button"
      onClick={requestCookieSettings}
    >
      Cookie settings
    </button>
  );
}
