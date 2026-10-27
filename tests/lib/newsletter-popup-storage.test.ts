// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";
import {
  getNewsletterPopupPreference,
  NEWSLETTER_POPUP_STORAGE_KEY,
  NEWSLETTER_POPUP_SUPPRESSION_MS,
  rememberNewsletterPopupPreference,
  rememberNewsletterSubscribed,
} from "@/lib/newsletter/popup-storage";

beforeEach(() => {
  localStorage.clear();
  getNewsletterPopupPreference();
});

describe("newsletter popup persistence", () => {
  it.each(["pending", "dismissed"] as const)(
    "suppresses a %s preference for seven days, then expires it",
    (status) => {
      const now = 1_800_000_000_000;
      rememberNewsletterPopupPreference(status, now);

      expect(getNewsletterPopupPreference(now + NEWSLETTER_POPUP_SUPPRESSION_MS - 1)).toEqual({
        status,
        at: now,
      });
      expect(
        getNewsletterPopupPreference(now + NEWSLETTER_POPUP_SUPPRESSION_MS),
      ).toBeNull();
      expect(localStorage.getItem(NEWSLETTER_POPUP_STORAGE_KEY)).toBeNull();
    },
  );

  it("keeps subscribed status long-lived and stores no email, token, or code", () => {
    rememberNewsletterSubscribed();

    expect(getNewsletterPopupPreference(Date.now() + 365 * NEWSLETTER_POPUP_SUPPRESSION_MS)).toMatchObject({
      status: "subscribed",
    });
    const stored = localStorage.getItem(NEWSLETTER_POPUP_STORAGE_KEY) ?? "";
    expect(stored).toContain('"status":"subscribed"');
    expect(stored).not.toMatch(/@|token|CREW-/i);
  });

  it("preserves separate pending and dismissed states", () => {
    rememberNewsletterPopupPreference("pending", 100);
    expect(JSON.parse(localStorage.getItem(NEWSLETTER_POPUP_STORAGE_KEY) ?? "{}")).toEqual({
      status: "pending",
      at: 100,
    });

    rememberNewsletterPopupPreference("dismissed", 200);
    expect(getNewsletterPopupPreference(201)).toEqual({ status: "dismissed", at: 200 });
  });
});
