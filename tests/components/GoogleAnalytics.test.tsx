// @vitest-environment jsdom

import { act, render } from "@testing-library/react";
import { createElement, useEffect } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ConsentAnalytics } from "@/components/ConsentAnalytics";
import { COOKIE_CONSENT_KEY } from "@/lib/cookieConsent";

const routeMocks = vi.hoisted(() => ({ pathname: "/" }));

vi.mock("next/navigation", () => ({ usePathname: () => routeMocks.pathname }));
vi.mock("next/script", () => ({
  default: function MockScript({
    id,
    src,
    onReady,
  }: {
    id: string;
    src: string;
    onReady?: () => void;
  }) {
    useEffect(() => {
      onReady?.();
    }, [onReady]);
    return createElement("script", { id, src });
  },
}));

function setConsent(performance: boolean) {
  const value = JSON.stringify({
    necessary: true,
    functional: false,
    performance,
    targeting: false,
    at: Date.now(),
  });
  localStorage.setItem(COOKIE_CONSENT_KEY, value);
  window.dispatchEvent(
    new StorageEvent("storage", { key: COOKIE_CONSENT_KEY, newValue: value }),
  );
}

beforeEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.stubEnv("NEXT_PUBLIC_GA_MEASUREMENT_ID", "G-TEST12345");
  routeMocks.pathname = "/";
  localStorage.clear();
  window.dataLayer = [];
  window.gtag = undefined;
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("consent-gated Google Analytics", () => {
  it("does not load before consent and mounts GA after performance consent", async () => {
    render(createElement(ConsentAnalytics));

    expect(document.querySelector("#google-analytics")).toBeNull();

    await act(async () => {
      setConsent(true);
    });

    expect(document.querySelector("#google-analytics")).toHaveAttribute(
      "src",
      "https://www.googletagmanager.com/gtag/js?id=G-TEST12345",
    );
    expect(
      window.dataLayer?.some(
        (entry) => entry[0] === "event" && entry[1] === "page_view",
      ),
    ).toBe(true);
    expect(window["ga-disable-G-TEST12345"]).toBe(false);
  });

  it("disables tracking and removes the component when consent is withdrawn", async () => {
    render(createElement(ConsentAnalytics));

    await act(async () => {
      setConsent(true);
    });
    await act(async () => {
      setConsent(false);
    });

    expect(document.querySelector("#google-analytics")).toBeNull();
    expect(window["ga-disable-G-TEST12345"]).toBe(true);
    expect(
      window.dataLayer?.some(
        (entry) =>
          entry[0] === "consent" &&
          entry[1] === "update" &&
          typeof entry[2] === "object" &&
          entry[2] !== null &&
          "analytics_storage" in entry[2] &&
          entry[2].analytics_storage === "denied",
      ),
    ).toBe(true);
  });
});
