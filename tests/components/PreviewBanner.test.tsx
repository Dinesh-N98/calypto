// @vitest-environment jsdom

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { PreviewBanner } from "@/components/PreviewBanner";

beforeEach(() => {
  window.sessionStorage.clear();
});

describe("PreviewBanner", () => {
  it("shows the announcement and remembers dismissal for the session", async () => {
    const user = userEvent.setup();
    render(<PreviewBanner />);

    expect(await screen.findByText("Calypto Preview - Early Access")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Online checkout is coming soon. Custom craft & wholesale inquiries are open.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Inquiries" }),
    ).toHaveAttribute("href", "/wholesale#wholesale-inquiry");

    await user.click(screen.getByRole("button", { name: "Dismiss announcement" }));

    expect(screen.queryByText("Calypto Preview — Early Access")).not.toBeInTheDocument();
    await waitFor(() =>
      expect(window.sessionStorage.getItem("calypto-preview-banner-dismissed")).toBe("true"),
    );
  });
});
