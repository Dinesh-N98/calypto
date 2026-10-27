// @vitest-environment jsdom

import { act, render } from "@testing-library/react";
import { createElement, StrictMode, useEffect } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ConsentAnalytics } from "@/components/ConsentAnalytics";
import { saveCookieConsent } from "@/lib/cookieConsent";

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
  saveCookieConsent({ functional: false, performance, targeting: false });
}

beforeEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.stubEnv("NEXT_PUBLIC_GA_MEASUREMENT_ID", "G-TEST12345");
  vi.stubEnv("NEXT_PUBLIC_GA_DEBUG", "false");
  routeMocks.pathname = "/";
  localStorage.clear();
  window.dataLayer = [];
  window.gtag = undefined;
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("consent-gated Google Analytics", () => {
  it("does not load or send events without performance consent", () => {
    render(createElement(ConsentAnalytics));

    expect(document.querySelector("#google-analytics")).toBeNull();
    expect(window.dataLayer).toEqual([]);
    expect(window.gtag).toBeUndefined();
  });

  it("sends config and the first storefront page_view after accepting consent", async () => {
    vi.stubEnv("NEXT_PUBLIC_GA_DEBUG", "true");
    const debugSpy = vi.spyOn(console, "debug").mockImplementation(() => {});
    document.title = "Storefront title";
    routeMocks.pathname = "/products/test";
    window.history.replaceState({}, "", "/products/test?variant=small");

    render(createElement(ConsentAnalytics));

    expect(document.querySelector("#google-analytics")).toBeNull();

    await act(async () => {
      setConsent(true);
    });

    expect(document.querySelector("#google-analytics")).toHaveAttribute(
      "src",
      "https://www.googletagmanager.com/gtag/js?id=G-TEST12345",
    );

    const consentCall = window.dataLayer?.find((entry) => entry[0] === "consent");
    expect(consentCall?.[2]).toMatchObject({ analytics_storage: "granted" });

    const configCall = window.dataLayer?.find((entry) => entry[0] === "config");
    expect(configCall).toBeDefined();
    expect(Object.prototype.toString.call(configCall)).toBe("[object Arguments]");
    expect(configCall?.[2]).toMatchObject({
      send_page_view: false,
      debug_mode: true,
    });

    const pageViewCall = window.dataLayer?.find(
      (entry) => entry[0] === "event" && entry[1] === "page_view",
    );
    expect(pageViewCall).toBeDefined();
    expect(Object.prototype.toString.call(pageViewCall)).toBe("[object Arguments]");
    expect(pageViewCall?.[2]).toMatchObject({
      page_path: "/products/test",
      page_location: "http://localhost:3000/products/test",
      page_title: "Storefront title",
    });
    expect(window.dataLayer?.map((entry) => entry[0])).toEqual([
      "consent",
      "js",
      "config",
      "event",
    ]);
    expect(debugSpy.mock.calls).toEqual([
      ["GA4 config sent."],
      ["GA4 page_view sent."],
    ]);
    expect(window["ga-disable-G-TEST12345"]).toBe(false);
  });

  it("sends one page_view per pathname under StrictMode and sanitizes order queries", async () => {
    routeMocks.pathname = "/checkout/success";
    window.history.replaceState({}, "", "/checkout/success?order=private-test-value");
    const { rerender } = render(
      createElement(StrictMode, null, createElement(ConsentAnalytics)),
    );

    await act(async () => {
      setConsent(true);
    });

    const pageViews = () =>
      window.dataLayer?.filter((entry) => entry[0] === "event" && entry[1] === "page_view") ??
      [];
    expect(pageViews()).toHaveLength(1);
    expect(pageViews()[0]?.[2]).toMatchObject({
      page_path: "/checkout/success",
      page_location: "http://localhost:3000/checkout/success",
    });
    expect(JSON.stringify(pageViews())).not.toContain("private-test-value");

    routeMocks.pathname = "/shop";
    window.history.replaceState(
      {},
      "",
      "/shop?utm_source=x&utm_campaign=y&order=1",
    );
    rerender(createElement(StrictMode, null, createElement(ConsentAnalytics)));

    expect(pageViews()).toHaveLength(2);
    expect(pageViews()[1]?.[2]).toMatchObject({
      page_path: "/shop?utm_source=x&utm_campaign=y",
      page_location:
        "http://localhost:3000/shop?utm_source=x&utm_campaign=y",
    });
  });

  it("does not load or initialize GA on admin routes", async () => {
    routeMocks.pathname = "/admin/";
    render(createElement(ConsentAnalytics));

    await act(async () => {
      setConsent(true);
    });

    expect(document.querySelector("#google-analytics")).toBeNull();
    expect(window.dataLayer).toEqual([]);
    expect(window.gtag).toBeUndefined();
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
