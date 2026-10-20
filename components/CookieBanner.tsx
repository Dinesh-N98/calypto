"use client";

import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import {
  COOKIE_SETTINGS_EVENT,
  type CookiePreferences,
  getCookieConsent,
  saveCookieConsent,
  subscribeCookieConsent,
} from "@/lib/cookieConsent";

type Preferences = Omit<CookiePreferences, "necessary">;

const allEnabled: Preferences = { functional: true, performance: true, targeting: true };
const allDisabled: Preferences = { functional: false, performance: false, targeting: false };

export function CookieBanner() {
  const [visible, setVisible] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    const syncConsent = () => setVisible(getCookieConsent() === null);
    syncConsent();

    const unsubscribe = subscribeCookieConsent(syncConsent);
    const openSettings = () => setSettingsOpen(true);
    window.addEventListener(COOKIE_SETTINGS_EVENT, openSettings);

    return () => {
      unsubscribe();
      window.removeEventListener(COOKIE_SETTINGS_EVENT, openSettings);
    };
  }, []);

  function save(preferences: Preferences) {
    saveCookieConsent(preferences);
    setSettingsOpen(false);
    setVisible(false);
  }

  if (!visible) {
    return settingsOpen ? (
      <CookieSettingsModal onClose={() => setSettingsOpen(false)} onSave={save} />
    ) : null;
  }

  return (
    <>
      <section
        className="fixed bottom-4 left-4 right-4 z-50 rounded-2xl border border-neutral-800/80 bg-neutral-950/90 p-5 text-paper shadow-2xl backdrop-blur-md transition-all duration-300 animate-[cookie-banner-in_300ms_ease-out_both] motion-reduce:animate-none md:left-auto md:right-6 md:max-w-xl"
        role="region"
        aria-label="Cookie consent"
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0 flex-1">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-neutral-100">
              <ShieldCheck aria-hidden="true" className="h-4 w-4 text-lime" />
              Privacy Preferences
            </h2>
            <p className="mt-2 text-xs leading-relaxed text-neutral-400">
              We use cookies to improve your experience and understand site usage. Choose which
              optional cookies you allow.
            </p>
            <Link
              className="mt-2 inline-block text-xs text-neutral-400 underline underline-offset-4 transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime"
              href="/privacy"
            >
              Privacy Policy
            </Link>
          </div>
          <div className="flex shrink-0 flex-col gap-3 md:items-end">
            <div className="flex gap-2">
              <button
                className="flex-1 rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-2 text-xs text-neutral-200 transition hover:bg-neutral-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime md:flex-none"
                type="button"
                onClick={() => save(allDisabled)}
              >
                Reject All
              </button>
              <button
                className="flex-1 rounded-lg bg-[#a3e635] px-4 py-2 text-xs font-semibold text-black transition hover:bg-[#84cc16] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime md:flex-none"
                type="button"
                onClick={() => save(allEnabled)}
              >
                Accept All
              </button>
            </div>
            <button
              className="self-center text-xs text-neutral-400 underline underline-offset-4 transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime md:self-end"
              type="button"
              onClick={() => setSettingsOpen(true)}
            >
              Settings
            </button>
          </div>
        </div>
      </section>
      {settingsOpen && <CookieSettingsModal onClose={() => setSettingsOpen(false)} onSave={save} />}
    </>
  );
}

function CookieSettingsModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (preferences: Preferences) => void;
}) {
  const stored = getCookieConsent();
  const [preferences, setPreferences] = useState<Preferences>({
    functional: stored?.functional ?? false,
    performance: stored?.performance ?? false,
    targeting: stored?.targeting ?? false,
  });

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  function updatePreference(key: keyof Preferences, value: boolean) {
    setPreferences((current) => ({ ...current, [key]: value }));
  }

  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="max-h-[90dvh] w-full max-w-xl overflow-y-auto border border-[rgba(241,240,232,.18)] bg-ink p-6 text-paper shadow-2xl md:p-8"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cookie-settings-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="cookie-settings-title" className="text-xl font-extrabold uppercase tracking-wide">
          Cookie Settings
        </h2>
        <div className="mt-5 divide-y divide-[rgba(241,240,232,.18)]">
          <CookieSettingRow
            id="cookie-necessary"
            title="Strictly Necessary"
            description="Required for the site to function."
            checked
            disabled
          />
          <CookieSettingRow
            id="cookie-functional"
            title="Functional"
            description="Remember choices and provide enhanced features."
            checked={preferences.functional}
            onChange={(checked) => updatePreference("functional", checked)}
          />
          <CookieSettingRow
            id="cookie-performance"
            title="Performance"
            description="Help us understand how the site is used."
            checked={preferences.performance}
            onChange={(checked) => updatePreference("performance", checked)}
          />
          <CookieSettingRow
            id="cookie-targeting"
            title="Targeting"
            description="Support relevant offers and marketing."
            checked={preferences.targeting}
            onChange={(checked) => updatePreference("targeting", checked)}
          />
        </div>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button
            className="auth-button w-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime sm:w-auto"
            type="button"
            onClick={() => onSave(preferences)}
          >
            Save Preferences
          </button>
          <button
            className="auth-button-secondary w-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime sm:w-auto"
            type="button"
            onClick={() => onSave(allEnabled)}
          >
            Accept All Cookies
          </button>
        </div>
      </div>
    </div>
  );
}

function CookieSettingRow({
  id,
  title,
  description,
  checked,
  disabled = false,
  onChange,
}: {
  id: string;
  title: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange?: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-4">
      <div>
        <p className="text-sm font-bold uppercase tracking-wide">{title}</p>
        <p className="mt-1 text-xs leading-[1.5] text-muted">{description}</p>
      </div>
      <label className="flex shrink-0 items-center" htmlFor={id}>
        <span className="sr-only">{title}</span>
        <input
          id={id}
          className="h-5 w-5 accent-lime focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime"
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(event) => onChange?.(event.currentTarget.checked)}
        />
      </label>
    </div>
  );
}
