import { Children, isValidElement, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: mocks.auth }));

import AccountLayout from "@/app/(storefront)/account/layout";
import { AccountNavigation } from "@/components/account/AccountNavigation";

function getAccountNavigationFlag(node: ReactNode): boolean | undefined {
  let isAdmin: boolean | undefined;

  Children.forEach(node, (child) => {
    if (!isValidElement(child)) return;

    if (child.type === AccountNavigation) {
      isAdmin = child.props.isAdmin;
      return;
    }

    isAdmin =
      getAccountNavigationFlag((child.props as { children?: ReactNode }).children) ?? isAdmin;
  });

  return isAdmin;
}

describe("AccountLayout admin navigation", () => {
  beforeEach(() => {
    mocks.auth.mockResolvedValue({ user: { id: "user-1", role: "CUSTOMER" } });
  });

  it("passes the authenticated admin role to account navigation", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } });

    const layout = await AccountLayout({ children: null });

    expect(getAccountNavigationFlag(layout)).toBe(true);
  });

  it("does not mark a customer as an admin", async () => {
    const layout = await AccountLayout({ children: null });

    expect(getAccountNavigationFlag(layout)).toBe(false);
  });
});
