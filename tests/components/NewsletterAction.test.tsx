// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NewsletterAction } from "@/components/NewsletterAction";
import { COOKIE_CONSENT_KEY } from "@/lib/cookieConsent";

vi.mock("next/link", () => ({
  default: ({ children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) =>
    createElement("a", props, children),
}));

const gtagMock = vi.fn();

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem(
    COOKIE_CONSENT_KEY,
    JSON.stringify({
      necessary: true,
      functional: false,
      performance: true,
      targeting: false,
      at: Date.now(),
    }),
  );
  gtagMock.mockClear();
  window.gtag = gtagMock;
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, discountCode: "CREW-ABCDEFGH" }),
    }),
  );
});

describe("NewsletterAction confirmation", () => {
  it("shows terms, copies the confirmed code, persists subscribed status, and tracks once", async () => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
    });

    render(createElement(NewsletterAction, { action: "confirm", token: "secret-token" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm my subscription" }));

    const discountCode = await screen.findByText("CREW-ABCDEFGH");
    expect(discountCode).toBeInTheDocument();
    expect(discountCode.className).toContain("text-[#171a14]");
    expect(
      screen.getByText(
        "A copy of your discount code has been sent to your inbox for easy access anytime.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/first order only and applies to the product subtotal, not shipping or tax/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/include this code in your order inquiry/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(window.gtag).toHaveBeenCalledWith("event", "generate_lead", {
        lead_source: "newsletter",
      });
    });
    fireEvent.click(screen.getByRole("button", { name: "Copy code" }));
    expect(await screen.findByText("Discount code copied.")).toBeInTheDocument();
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("CREW-ABCDEFGH");
    expect(JSON.parse(localStorage.getItem("calypto-newsletter-popup") ?? "{}")).toMatchObject({
      status: "subscribed",
    });
    expect(JSON.stringify(gtagMock.mock.calls)).not.toMatch(/secret-token|CREW-ABCDEFGH/i);
  });

  it("does not track confirmation without performance consent", async () => {
    localStorage.setItem(
      COOKIE_CONSENT_KEY,
      JSON.stringify({
        necessary: true,
        functional: false,
        performance: false,
        targeting: false,
        at: Date.now(),
      }),
    );
    render(createElement(NewsletterAction, { action: "confirm", token: "secret-token" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm my subscription" }));

    expect(await screen.findByText("CREW-ABCDEFGH")).toBeInTheDocument();
    expect(gtagMock).not.toHaveBeenCalled();
  });
});
