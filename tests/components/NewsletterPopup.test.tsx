// @vitest-environment jsdom

import { act, fireEvent, render, screen } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NewsletterPopup } from "@/components/NewsletterPopup";
import { COOKIE_CONSENT_KEY } from "@/lib/cookieConsent";

vi.mock("next/navigation", () => ({ usePathname: () => "/" }));
vi.mock("next/image", () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => createElement("img", props),
}));

const NEWSLETTER_KEY = "calypto-newsletter-popup";

beforeEach(() => {
  vi.unstubAllGlobals();
  vi.useFakeTimers();
  localStorage.clear();
  localStorage.setItem(
    COOKIE_CONSENT_KEY,
    JSON.stringify({
      necessary: true,
      functional: false,
      performance: false,
      targeting: true,
      at: Date.now(),
    }),
  );
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("NewsletterPopup visibility states", () => {
  it("minimizes to a badge on close and reopens from the badge", async () => {
    render(createElement(NewsletterPopup));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(6000);
    });
    expect(screen.getByRole("dialog", { name: "15% Off" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    const badge = screen.getByRole("button", { name: "Reopen newsletter offer: get 15% off" });
    expect(badge).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem(NEWSLETTER_KEY) ?? "{}")).toMatchObject({
      status: "dismissed",
    });

    fireEvent.click(badge);
    expect(screen.getByRole("dialog", { name: "15% Off" })).toBeInTheDocument();
  });

  it("hides the modal and badge after a successful subscription", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
    render(createElement(NewsletterPopup));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(6000);
    });

    const emailInput = screen.getByRole("textbox", { name: "Your email address" });
    fireEvent.change(emailInput, {
      target: { value: "angler@example.com" },
    });
    await act(async () => {
      fireEvent.submit(emailInput.closest("form")!);
      await Promise.resolve();
    });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reopen newsletter offer: get 15% off" })).toBeNull();
    expect(JSON.parse(localStorage.getItem(NEWSLETTER_KEY) ?? "{}")).toMatchObject({
      status: "subscribed",
    });
  });
});
