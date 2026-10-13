import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  userFindUnique: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/prisma", () => ({
  prisma: { user: { findUnique: mocks.userFindUnique } },
}));

import { requireAdminPage, requireAdminRequest } from "@/lib/admin";

beforeEach(() => {
  mocks.auth.mockResolvedValue({ user: { id: "admin-1" } });
  mocks.userFindUnique.mockResolvedValue({
    id: "admin-1",
    name: "Store Admin",
    email: "admin@example.com",
    role: "ADMIN",
  });
});

describe("admin CRM boundary helper", () => {
  it("rejects unauthenticated API requests before looking up a user", async () => {
    mocks.auth.mockResolvedValue(null);

    const result = await requireAdminRequest();

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(401);
      expect(await result.response.json()).toEqual({ error: "You must be signed in." });
    }
    expect(mocks.userFindUnique).not.toHaveBeenCalled();
  });

  it("rechecks the database role and rejects a customer despite an existing session", async () => {
    mocks.userFindUnique.mockResolvedValue({
      id: "admin-1",
      name: "Former Admin",
      email: "former-admin@example.com",
      role: "CUSTOMER",
    });

    const result = await requireAdminRequest();

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(403);
      expect(await result.response.json()).toEqual({ error: "You are not authorized." });
    }
    expect(mocks.userFindUnique).toHaveBeenCalledWith({
      where: { id: "admin-1" },
      select: { id: true, name: true, email: true, role: true },
    });
  });

  it("applies the same fresh-role check to protected admin pages", async () => {
    mocks.userFindUnique.mockResolvedValue({
      id: "admin-1",
      name: "Former Admin",
      email: "former-admin@example.com",
      role: "CUSTOMER",
    });

    await expect(requireAdminPage("/admin/crm")).rejects.toThrow();
    expect(mocks.userFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "admin-1" } }),
    );
  });
});
