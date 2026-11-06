import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  getDHLRates: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    sriLankaShippingRateSettings: { findUnique: mocks.findUnique },
  },
}));
vi.mock("@/lib/dhl/rate", () => ({
  getDHLRates: mocks.getDHLRates,
}));

import { DhlApiError } from "@/lib/dhl/client";
import {
  getCheckoutShippingRates,
  getSriLankaLocalShippingRate,
} from "@/lib/checkout/sri-lanka-shipping";

const settings = {
  underOneKgCents: 300,
  oneToThreeKgCents: 500,
  overThreeKgCents: 1_000,
};

const request = {
  recipient: {
    streetLines: ["12 Main Street"],
    city: "Colombo",
    postalCode: "00100",
    countryCode: "LK",
  },
  packages: [{ weightKg: 0.5, lengthCm: 10, widthCm: 10, heightCm: 5 }],
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.findUnique.mockResolvedValue(settings);
  mocks.getDHLRates.mockResolvedValue([
    { serviceCode: "P", serviceName: "DHL Express", currency: "USD", amount: 8.5 },
  ]);
});

describe("Sri Lanka weight-based shipping rates", () => {
  it.each([
    [0.5, 300, "under 1 kg"],
    [0.999, 300, "under 1 kg"],
    [1, 500, "1-3 kg"],
    [3, 500, "1-3 kg"],
    [3.001, 1_000, "over 3 kg"],
  ])("prices %.3f kg at %i cents (%s)", (weightKg, cents, tierLabel) => {
    expect(getSriLankaLocalShippingRate(weightKg, settings)).toMatchObject({
      serviceCode: "LK-LOCAL-WEIGHT",
      serviceName: `Sri Lanka local delivery (${tierLabel})`,
      currency: "USD",
      amount: cents / 100,
    });
  });

  it("uses available DHL domestic rates without loading local settings", async () => {
    await expect(getCheckoutShippingRates(request)).resolves.toEqual([
      { serviceCode: "P", serviceName: "DHL Express", currency: "USD", amount: 8.5 },
    ]);
    expect(mocks.findUnique).not.toHaveBeenCalled();
  });

  it("uses the configured weight tier when DHL returns no usable Sri Lanka rates", async () => {
    const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
    mocks.getDHLRates.mockRejectedValueOnce(
      new DhlApiError("No domestic service.", { kind: "api", code: "998" }),
    );

    await expect(getCheckoutShippingRates(request)).resolves.toMatchObject([
      {
        serviceCode: "LK-LOCAL-WEIGHT",
        serviceName: "Sri Lanka local delivery (under 1 kg)",
        currency: "USD",
        amount: 3,
      },
    ]);
    expect(mocks.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "LK" } }));
    expect(warning).toHaveBeenCalledOnce();
    warning.mockRestore();
  });

  it("does not hide DHL configuration or network failures behind a local rate", async () => {
    for (const kind of ["configuration", "network"] as const) {
      mocks.getDHLRates.mockRejectedValueOnce(new DhlApiError("DHL unavailable.", { kind }));
      await expect(getCheckoutShippingRates(request)).rejects.toMatchObject({
        details: { kind },
      });
    }
    expect(mocks.findUnique).not.toHaveBeenCalled();
  });

  it("does not use local Sri Lanka rates for international destinations", async () => {
    mocks.getDHLRates.mockRejectedValueOnce(new DhlApiError("No service.", { kind: "api" }));
    await expect(
      getCheckoutShippingRates({
        ...request,
        recipient: { ...request.recipient, countryCode: "SG" },
      }),
    ).rejects.toMatchObject({ details: { kind: "api" } });
    expect(mocks.findUnique).not.toHaveBeenCalled();
  });
});
