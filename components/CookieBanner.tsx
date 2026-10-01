"use client";

import { startTransition, useEffect, useState } from "react";
import { getCookieConsent, saveCookieConsent } from "@/lib/cookieConsent";

type Preferences = { functional: boolean; performance: boolean; targeting: boolean };

const allEnabled: Preferences = { functional: true, performance: true, targeting: true };
const allDisabled: Preferences = { functional: false, performance: false, targeting: false };

export function CookieBanner() {
  const [visible, setVisible] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    startTransition(() => setVisible(getCookieConsent() === null));
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
        className="fixed inset-x-0 bottom-0 z-[80] border-t border-[rgba(241,240,232,.18)] bg-ink text-paper"
        role="region"
        aria-label="Cookie consent"
      >
        <div className="flex flex-col gap-4 px-[7vw] py-5 md:flex-row md:items-center md:justify-between md:px-[10vw]">
          <p className="max-w-2xl text-[.8rem] leading-[1.6] text-muted">
            By clicking “Accept All Cookies”, you agree to the storing of cookies on your device to
            enhance site navigation, analyze site usage, and assist in our marketing efforts.
          </p>
          <div className="flex flex-col gap-3 md:flex-row md:flex-wrap">
            <button
              className="auth-button-secondary w-full !py-2.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime md:w-auto md:!py-4"
              type="button"
              onClick={() => setSettingsOpen(true)}
            >
              Cookies Settings
            </button>
            <button
              className="auth-button-secondary w-full !py-2.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime md:w-auto md:!py-4"
              type="button"
              onClick={() => save(allDisabled)}
            >
              Reject All
            </button>
            <button
              className="auth-button w-full !py-2.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime md:w-auto md:!py-4"
              type="button"
              onClick={() => save(allEnabled)}
            >
              Accept All Cookies
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
