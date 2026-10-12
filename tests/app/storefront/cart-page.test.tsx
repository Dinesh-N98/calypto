import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  findUnique: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/prisma", () => ({
  prisma: { user: { findUnique: mocks.findUnique } },
}));

import CartPage from "@/app/(storefront)/cart/page";

const savedAddress = {
  id: "address-1",
  line1: "12 River Road",
  line2: null,
  city: "Colombo",
  state: "Western",
  postalCode: "00100",
  country: "Sri Lanka",
  isDefault: true,
};

beforeEach(() => {
  mocks.auth.mockResolvedValue({ user: { id: "user-1" } });
  mocks.findUnique.mockResolvedValue({
    firstName: "Ada",
    lastName: "Lovelace",
    email: "ada@example.com",
    phone: "+94771234567",
    addresses: [savedAddress],
  });
});

describe("CartPage server checkout data", () => {
  it("loads profile and ordered addresses for the authenticated session user", async () => {
    const page = await CartPage({ searchParams: Promise.resolve({}) });
    const props = page.props as {
      profile: unknown;
      savedAddresses: unknown;
      defaultAddress: unknown;
      isAuthenticated: boolean;
    };

    expect(mocks.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "user-1" },
        select: expect.objectContaining({
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          addresses: expect.objectContaining({
            orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
          }),
        }),
      }),
    );
    expect(props).toMatchObject({
      profile: {
        firstName: "Ada",
        lastName: "Lovelace",
        email: "ada@example.com",
        phone: "+94771234567",
      },
      defaultAddress: savedAddress,
      savedAddresses: [savedAddress],
      isAuthenticated: true,
    });
  });

  it("does not load user profile data for a guest", async () => {
    mocks.auth.mockResolvedValue(null);

    const page = await CartPage({ searchParams: Promise.resolve({}) });
    const props = page.props as {
      profile: unknown;
      savedAddresses: unknown[];
      defaultAddress: unknown;
      isAuthenticated: boolean;
    };

    expect(mocks.findUnique).not.toHaveBeenCalled();
    expect(props).toMatchObject({
      profile: null,
      savedAddresses: [],
      defaultAddress: null,
      isAuthenticated: false,
    });
  });

  it("uses the first address in server order when none is marked default", async () => {
    const recentAddress = { ...savedAddress, id: "recent", isDefault: false };
    const olderAddress = { ...savedAddress, id: "older", line1: "Old Street", isDefault: false };
    mocks.findUnique.mockResolvedValue({
      firstName: "Ada",
      lastName: "Lovelace",
      email: "ada@example.com",
      phone: "+94771234567",
      addresses: [recentAddress, olderAddress],
    });

    const page = await CartPage({ searchParams: Promise.resolve({}) });
    const props = page.props as { defaultAddress: unknown };

    expect(props.defaultAddress).toEqual(recentAddress);
  });
});
