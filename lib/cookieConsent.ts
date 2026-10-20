export const COOKIE_CONSENT_KEY = "calypto-cookie-consent";
export const COOKIE_CONSENT_EVENT = "calypto-cookie-consent-change";
export const COOKIE_SETTINGS_EVENT = "calypto-cookie-settings-open";

export type CookiePreferences = {
  necessary: true;
  functional: boolean;
  performance: boolean;
  targeting: boolean;
};

export type CookieConsent = CookiePreferences & {
  at: number;
};

let memoryConsent: CookieConsent | null = null;
let storageUnavailable = false;

function parseCookieConsent(value: string | null): CookieConsent | null {
  if (!value) return null;

  try {
    const stored: unknown = JSON.parse(value);
    if (
      typeof stored !== "object" ||
      stored === null ||
      !("necessary" in stored) ||
      stored.necessary !== true ||
      !("functional" in stored) ||
      typeof stored.functional !== "boolean" ||
      !("performance" in stored) ||
      typeof stored.performance !== "boolean" ||
      !("targeting" in stored) ||
      typeof stored.targeting !== "boolean" ||
      !("at" in stored) ||
      typeof stored.at !== "number" ||
      !Number.isFinite(stored.at)
    ) {
      return null;
    }

    return {
      necessary: true,
      functional: stored.functional,
      performance: stored.performance,
      targeting: stored.targeting,
      at: stored.at,
    };
  } catch {
    return null;
  }
}

export function getCookieConsent(): CookieConsent | null {
  if (typeof window === "undefined") return null;
  if (storageUnavailable) return memoryConsent;

  try {
    const raw = window.localStorage.getItem(COOKIE_CONSENT_KEY);
    if (raw === null) return null;

    memoryConsent = parseCookieConsent(raw);
    storageUnavailable = false;
    return memoryConsent;
  } catch {
    return memoryConsent;
  }
}

export function saveCookieConsent(prefs: Omit<CookiePreferences, "necessary">): void {
  if (typeof window === "undefined") return;

  const consent: CookieConsent = { necessary: true, ...prefs, at: Date.now() };
  memoryConsent = consent;

  try {
    window.localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(consent));
    storageUnavailable = false;
  } catch {
    storageUnavailable = true;
  }

  window.dispatchEvent(new Event(COOKIE_CONSENT_EVENT));
}

export function subscribeCookieConsent(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};

  const onConsentChange = () => callback();
  const onStorage = (event: StorageEvent) => {
    if (event.key !== COOKIE_CONSENT_KEY && event.key !== null) return;

    memoryConsent = parseCookieConsent(event.key === null ? null : event.newValue);
    storageUnavailable = false;
    callback();
  };

  window.addEventListener(COOKIE_CONSENT_EVENT, onConsentChange);
  window.addEventListener("storage", onStorage);

  return () => {
    window.removeEventListener(COOKIE_CONSENT_EVENT, onConsentChange);
    window.removeEventListener("storage", onStorage);
  };
}

export function requestCookieSettings(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(COOKIE_SETTINGS_EVENT));
}
