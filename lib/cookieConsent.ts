export const COOKIE_CONSENT_KEY = "calypto-cookie-consent";
export const COOKIE_CONSENT_EVENT = "calypto-cookie-consent-change";

export type CookieConsent = {
  necessary: true;
  functional: boolean;
  performance: boolean;
  targeting: boolean;
  at: number;
};

export function getCookieConsent(): CookieConsent | null {
  try {
    const stored = JSON.parse(window.localStorage.getItem(COOKIE_CONSENT_KEY) ?? "null");

    if (
      stored?.necessary !== true ||
      typeof stored.functional !== "boolean" ||
      typeof stored.performance !== "boolean" ||
      typeof stored.targeting !== "boolean" ||
      typeof stored.at !== "number" ||
      !Number.isFinite(stored.at)
    ) {
      return null;
    }

    return stored as CookieConsent;
  } catch {
    return null;
  }
}

// Consent is exposed for future gating; this module does not load analytics or marketing scripts.
export function saveCookieConsent(prefs: Omit<CookieConsent, "necessary" | "at">): void {
  try {
    window.localStorage.setItem(
      COOKIE_CONSENT_KEY,
      JSON.stringify({ necessary: true, ...prefs, at: Date.now() } satisfies CookieConsent),
    );
  } catch {
    // Consent remains usable for the current page when storage is unavailable.
  }

  window.dispatchEvent(new CustomEvent(COOKIE_CONSENT_EVENT));
}
