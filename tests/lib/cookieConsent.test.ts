// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createElement, Fragment } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CookieBanner } from "@/components/CookieBanner";
import { CookieSettingsTrigger } from "@/components/CookieSettingsTrigger";
import {
  COOKIE_CONSENT_KEY,
  getCookieConsent,
  saveCookieConsent,
  subscribeCookieConsent,
} from "@/lib/cookieConsent";

beforeEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
  localStorage.setItem(COOKIE_CONSENT_KEY, "null");
});

describe("cookie consent storage", () => {
  it("persists and reads category choices", () => {
    saveCookieConsent({ functional: false, performance: true, targeting: false });

    expect(getCookieConsent()).toMatchObject({
      necessary: true,
      functional: false,
      performance: true,
      targeting: false,
    });
  });

  it("keeps the current-page choice available when storage writes fail", () => {
    saveCookieConsent({ functional: true, performance: true, targeting: true });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("Storage is unavailable");
    });

    saveCookieConsent({ functional: false, performance: false, targeting: false });

    expect(getCookieConsent()?.performance).toBe(false);
  });

  it("updates subscribers when consent changes in another tab", () => {
    const callback = vi.fn();
    const unsubscribe = subscribeCookieConsent(callback);
    const remoteConsent = JSON.stringify({
      necessary: true,
      functional: true,
      performance: false,
      targeting: false,
      at: Date.now(),
    });
    localStorage.setItem(COOKIE_CONSENT_KEY, remoteConsent);

    window.dispatchEvent(
      new StorageEvent("storage", { key: COOKIE_CONSENT_KEY, newValue: remoteConsent }),
    );

    expect(callback).toHaveBeenCalledOnce();
    expect(getCookieConsent()?.performance).toBe(false);
    unsubscribe();
  });

  it("reopens settings from the persistent settings trigger", async () => {
    const user = userEvent.setup();
    render(
      createElement(
        Fragment,
        null,
        createElement(CookieBanner),
        createElement(CookieSettingsTrigger),
      ),
    );

    await screen.findByRole("region", { name: "Cookie consent" });
    await user.click(screen.getByRole("button", { name: "Cookie settings" }));

    expect(await screen.findByRole("dialog", { name: "Cookie Settings" })).toBeInTheDocument();
  });
});
