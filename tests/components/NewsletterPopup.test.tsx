// @vitest-environment jsdom

import { act, fireEvent, render, screen } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NewsletterPopup } from "@/components/NewsletterPopup";
import { COOKIE_CONSENT_KEY } from "@/lib/cookieConsent";

const routeMocks = vi.hoisted(() => ({ pathname: "/" }));

vi.mock("next/navigation", () => ({ usePathname: () => routeMocks.pathname }));
vi.mock("next/image", () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => createElement("img", props),
}));

const NEWSLETTER_KEY = "calypto-newsletter-popup";

function updateTargetingConsent(targeting: boolean) {
  const consent = JSON.stringify({
    necessary: true,
    functional: false,
    performance: false,
    targeting,
    at: Date.now(),
  });
  localStorage.setItem(COOKIE_CONSENT_KEY, consent);
  window.dispatchEvent(
    new StorageEvent("storage", { key: COOKIE_CONSENT_KEY, newValue: consent }),
  );
}

beforeEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useFakeTimers();
  routeMocks.pathname = "/";
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
  it("does not display without a valid consent record", async () => {
    localStorage.removeItem(COOKIE_CONSENT_KEY);
    render(createElement(NewsletterPopup));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(12_000);
    });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reopen newsletter offer: get 15% off" })).toBeNull();
  });

  it("does not display when targeting consent is rejected", async () => {
    updateTargetingConsent(false);
    render(createElement(NewsletterPopup));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(12_000);
    });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reopen newsletter offer: get 15% off" })).toBeNull();
  });

  it("waits the full six seconds when targeting consent is enabled", async () => {
    render(createElement(NewsletterPopup));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5999);
    });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(screen.getByRole("dialog", { name: "15% Off" })).toBeInTheDocument();
  });

  it("suppresses the popup on excluded routes and clears the pending timer", async () => {
    const view = render(createElement(NewsletterPopup));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    routeMocks.pathname = "/checkout";
    view.rerender(createElement(NewsletterPopup));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    routeMocks.pathname = "/";
    view.rerender(createElement(NewsletterPopup));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5999);
    });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(screen.getByRole("dialog", { name: "15% Off" })).toBeInTheDocument();
  });

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
    expect(JSON.parse(localStorage.getItem(NEWSLETTER_KEY) ?? "{}")).toMatchObject({
      status: "dismissed",
    });
  });

  it.each(["Escape", "backdrop"] as const)(
    "minimizes to a badge when dismissed by %s",
    async (method) => {
      render(createElement(NewsletterPopup));
      await act(async () => {
        await vi.advanceTimersByTimeAsync(6000);
      });

      if (method === "Escape") {
        fireEvent.keyDown(document, { key: "Escape" });
      } else {
        const dialog = screen.getByRole("dialog", { name: "15% Off" });
        fireEvent.click(dialog.parentElement!);
      }

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Reopen newsletter offer: get 15% off" }))
        .toBeInTheDocument();
      expect(JSON.parse(localStorage.getItem(NEWSLETTER_KEY) ?? "{}")).toMatchObject({
        status: "dismissed",
      });
    },
  );

  it("hides the modal and badge after a successful subscription", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
    const view = render(createElement(NewsletterPopup));

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
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/subscribe",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ email: "angler@example.com" }),
      }),
    );

    view.unmount();
    render(createElement(NewsletterPopup));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(12_000);
    });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reopen newsletter offer: get 15% off" })).toBeNull();
  });

  it("hides on targeting withdrawal and waits before showing after consent is granted", async () => {
    render(createElement(NewsletterPopup));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(6000);
    });
    expect(screen.getByRole("dialog", { name: "15% Off" })).toBeInTheDocument();

    act(() => updateTargetingConsent(false));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reopen newsletter offer: get 15% off" })).toBeNull();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    act(() => updateTargetingConsent(true));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5999);
    });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(screen.getByRole("dialog", { name: "15% Off" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.getByRole("button", { name: "Reopen newsletter offer: get 15% off" })).toBeInTheDocument();
    act(() => updateTargetingConsent(false));
    expect(screen.queryByRole("button", { name: "Reopen newsletter offer: get 15% off" })).toBeNull();

    act(() => updateTargetingConsent(true));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(6000);
    });
    expect(screen.getByRole("button", { name: "Reopen newsletter offer: get 15% off" })).toBeInTheDocument();
  });

  it("shows a retryable error when subscription fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ error: "Please try again." }),
      }),
    );
    render(createElement(NewsletterPopup));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(6000);
    });
    const emailInput = screen.getByRole("textbox", { name: "Your email address" });
    fireEvent.change(emailInput, { target: { value: "angler@example.com" } });

    await act(async () => {
      fireEvent.submit(emailInput.closest("form")!);
      await Promise.resolve();
    });

    expect(screen.getByRole("alert")).toHaveTextContent("Please try again.");
    expect(screen.getByRole("button", { name: /Get my 15% off/ })).toBeEnabled();
    expect(screen.getByRole("dialog", { name: "15% Off" })).toBeInTheDocument();
  });

  it("preserves the submitting state and allows retry after a network error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Network unavailable")));
    render(createElement(NewsletterPopup));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(6000);
    });
    const emailInput = screen.getByRole("textbox", { name: "Your email address" });
    fireEvent.change(emailInput, { target: { value: "angler@example.com" } });

    await act(async () => {
      fireEvent.submit(emailInput.closest("form")!);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.getByRole("alert")).toHaveTextContent("Something went wrong. Please try again.");
    expect(screen.getByRole("button", { name: /Get my 15% off/ })).toBeEnabled();
    expect(screen.getByRole("dialog", { name: "15% Off" })).toBeInTheDocument();
  });

  it("ignores malformed newsletter storage and continues with the consent-gated flow", async () => {
    localStorage.setItem(NEWSLETTER_KEY, "{invalid json");
    render(createElement(NewsletterPopup));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(6000);
    });

    expect(screen.getByRole("dialog", { name: "15% Off" })).toBeInTheDocument();
  });

  it("keeps dismissal state in memory when localStorage access fails", async () => {
    const { unmount } = render(createElement(NewsletterPopup));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(6000);
    });
    const originalGetItem = Storage.prototype.getItem;
    const originalSetItem = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(function (this: Storage, key) {
      if (key === NEWSLETTER_KEY) throw new DOMException("Storage is unavailable");
      return originalGetItem.call(this, key);
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (
      this: Storage,
      key,
      value,
    ) {
      if (key === NEWSLETTER_KEY) throw new DOMException("Storage is unavailable");
      return originalSetItem.call(this, key, value);
    });

    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.getByRole("button", { name: "Reopen newsletter offer: get 15% off" })).toBeInTheDocument();

    unmount();
    render(createElement(NewsletterPopup));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(6000);
    });
    expect(screen.getByRole("button", { name: "Reopen newsletter offer: get 15% off" })).toBeInTheDocument();
  });
});
