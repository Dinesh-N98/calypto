// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  usePathname: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: mocks.usePathname,
}));

import { AccountNavigation } from "@/components/account/AccountNavigation";

describe("AccountNavigation", () => {
  beforeEach(() => {
    mocks.usePathname.mockReturnValue("/account");
  });

  it("does not show the admin dashboard link to non-admin users", () => {
    render(<AccountNavigation />);

    expect(screen.queryByRole("link", { name: "Admin Dashboard" })).not.toBeInTheDocument();
  });

  it("shows the admin dashboard link to admin users", () => {
    render(<AccountNavigation isAdmin />);

    expect(screen.getByRole("link", { name: "Admin Dashboard" })).toHaveAttribute("href", "/admin");
  });
});
