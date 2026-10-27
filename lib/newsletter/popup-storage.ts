export const NEWSLETTER_POPUP_STORAGE_KEY = "calypto-newsletter-popup";
export const NEWSLETTER_POPUP_SUPPRESSION_MS = 7 * 24 * 60 * 60 * 1000;

export type NewsletterPopupPreference =
  | { status: "dismissed" | "pending"; at: number }
  | { status: "subscribed"; at: number };

let memoryPreference: NewsletterPopupPreference | null = null;

function parsePreference(raw: string | null): NewsletterPopupPreference | null {
  if (!raw) return null;

  try {
    const value: unknown = JSON.parse(raw);
    if (
      typeof value !== "object" ||
      value === null ||
      !("status" in value) ||
      !("at" in value) ||
      typeof value.at !== "number" ||
      !Number.isFinite(value.at) ||
      value.at < 0
    ) {
      return null;
    }

    if (
      value.status === "dismissed" ||
      value.status === "pending" ||
      value.status === "subscribed"
    ) {
      return { status: value.status, at: value.at };
    }
    return null;
  } catch {
    return null;
  }
}

export function getNewsletterPopupPreference(
  now: number = Date.now(),
): NewsletterPopupPreference | null {
  if (typeof window === "undefined") return null;

  try {
    const stored = parsePreference(window.localStorage.getItem(NEWSLETTER_POPUP_STORAGE_KEY));
    memoryPreference = stored;

    if (!stored || stored.status === "subscribed") return stored;
    const age = now - stored.at;
    if (age >= 0 && age < NEWSLETTER_POPUP_SUPPRESSION_MS) return stored;

    window.localStorage.removeItem(NEWSLETTER_POPUP_STORAGE_KEY);
    memoryPreference = null;
    return null;
  } catch {
    if (!memoryPreference || memoryPreference.status === "subscribed") return memoryPreference;
    const age = now - memoryPreference.at;
    return age >= 0 && age < NEWSLETTER_POPUP_SUPPRESSION_MS ? memoryPreference : null;
  }
}

export function rememberNewsletterPopupPreference(
  status: NewsletterPopupPreference["status"],
  now: number = Date.now(),
): void {
  if (typeof window === "undefined") return;
  memoryPreference = { status, at: now };
  try {
    window.localStorage.setItem(NEWSLETTER_POPUP_STORAGE_KEY, JSON.stringify(memoryPreference));
  } catch {
    return;
  }
}

export function rememberNewsletterSubscribed(): void {
  rememberNewsletterPopupPreference("subscribed");
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("calypto-newsletter-popup-change"));
  }
}

export function clearNewsletterPopupPreference(): void {
  if (typeof window === "undefined") return;
  memoryPreference = null;
  try {
    window.localStorage.removeItem(NEWSLETTER_POPUP_STORAGE_KEY);
  } catch {
    return;
  } finally {
    window.dispatchEvent(new Event("calypto-newsletter-popup-change"));
  }
}
