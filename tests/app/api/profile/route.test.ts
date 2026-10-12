import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  transaction: vi.fn(),
  addressCount: vi.fn(),
  addressCreate: vi.fn(),
  addressDelete: vi.fn(),
  addressFindFirst: vi.fn(),
  addressFindMany: vi.fn(),
  addressUpdate: vi.fn(),
  addressUpdateMany: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/prisma", () => ({
  prisma: { $transaction: mocks.transaction },
}));

import { PATCH } from "@/app/api/profile/route";

const existingAddress = {
  id: "address-1",
  userId: "user-1",
  line1: "12 River Road",
  line2: null,
  city: "Colombo",
  state: "Western",
  postalCode: "00100",
  country: "Sri Lanka",
  isDefault: true,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};

function makeRequest(address: Record<string, unknown>) {
  return new Request("http://localhost/api/profile", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ addresses: address }),
  });
}

beforeEach(() => {
  mocks.auth.mockResolvedValue({ user: { id: "user-1" } });
  mocks.addressCount.mockResolvedValue(0);
  mocks.addressCreate.mockResolvedValue(existingAddress);
  mocks.addressFindFirst.mockResolvedValue(existingAddress);
  mocks.addressFindMany.mockResolvedValue([existingAddress]);
  mocks.addressUpdate.mockResolvedValue(existingAddress);
  mocks.addressUpdateMany.mockResolvedValue({ count: 0 });
  mocks.addressDelete.mockResolvedValue(existingAddress);
  mocks.transaction.mockImplementation(async (callback) =>
    callback({
      address: {
        count: mocks.addressCount,
        create: mocks.addressCreate,
        delete: mocks.addressDelete,
        findFirst: mocks.addressFindFirst,
        findMany: mocks.addressFindMany,
        update: mocks.addressUpdate,
        updateMany: mocks.addressUpdateMany,
      },
    }),
  );
});

describe("PATCH /api/profile address state handling", () => {
  it("accepts and persists state when creating a saved address", async () => {
    const response = await PATCH(
      makeRequest({
        action: "create",
        line1: "12 River Road",
        line2: "",
        city: "Colombo",
        state: "  Western  ",
        postalCode: "00100",
        country: "Sri Lanka",
      }),
    );

    expect(response.status).toBe(200);
    expect(mocks.addressCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ state: "Western" }),
      }),
    );
    expect(await response.json()).toMatchObject({
      addresses: [{ id: "address-1", state: "Western" }],
    });
  });

  it("persists state updates for an address owned by the session user", async () => {
    mocks.addressUpdate.mockResolvedValue({ ...existingAddress, state: "Central" });
    mocks.addressFindMany.mockResolvedValue([{ ...existingAddress, state: "Central" }]);
    const response = await PATCH(
      makeRequest({
        action: "update",
        id: "address-1",
        state: "Central",
      }),
    );

    expect(mocks.addressFindFirst).toHaveBeenCalledWith({
      where: { id: "address-1", userId: "user-1" },
    });
    expect(mocks.addressUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "address-1" },
        data: { state: "Central" },
      }),
    );
    expect(await response.json()).toMatchObject({
      addresses: [{ id: "address-1", state: "Central" }],
    });
  });

  it("rejects a state value longer than the 100-character limit", async () => {
    const response = await PATCH(
      makeRequest({
        action: "create",
        line1: "12 River Road",
        line2: "",
        city: "Colombo",
        state: "S".repeat(101),
        postalCode: "00100",
        country: "Sri Lanka",
      }),
    );

    expect(response.status).toBe(400);
    expect(mocks.transaction).not.toHaveBeenCalled();
    expect(await response.json()).toEqual({
      error: "Address fields are invalid or missing.",
    });
  });
});
