import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { buildPickupRequestBody, requestDhlPickup } from "@/lib/dhl/pickup";

const request = {
  pickupTimestamp: new Date("2026-10-29T13:00:00.000Z"),
  pickupLocationCloseTime: "16:30",
  pickupLocation: "Colombo 02",
  specialInstruction: "Call before arrival",
  shipper: {
    personName: "Calypto Bait",
    companyName: "Calypto Bait",
    phoneNumber: "+94112223344",
    emailAddress: "shipping@example.com",
    streetLines: "A&B Street",
    city: "Colombo 02",
    postalCode: "00200",
    countryCode: "LK",
  },
  packages: [{
    weightKg: 1,
    lengthCm: 10,
    widthCm: 10,
    heightCm: 10,
    customerReference: "CAL-TEST",
  }],
};

describe("DHL pickup request", () => {
  it("serializes the pickup namespace, billing, location, and package", () => {
    const xml = buildPickupRequestBody(request, "524123");
    expect(xml).toContain("PickUpRequest");
    expect(xml).toContain("<ServiceType>U</ServiceType>");
    expect(xml).toContain("<ShipperAccountNumber>524123</ShipperAccountNumber>");
    expect(xml).toContain("<PickupLocation>Colombo 02</PickupLocation>");
    expect(xml).toContain("A&amp;B Street");
    expect(xml).toContain("<CustomerReferences>CAL-TEST</CustomerReferences>");
  });

  it("rejects pickup requests without packages or shipper contact details", () => {
    expect(() => buildPickupRequestBody({ ...request, packages: [] }, "524123")).toThrow(
      "pickup package",
    );
    expect(() => buildPickupRequestBody({
      ...request,
      shipper: { ...request.shipper, phoneNumber: "" },
    }, "524123")).toThrow("phone and email");
  });

  it("parses a mocked DHL pickup confirmation", async () => {
    vi.stubEnv("DHL_USERNAME", "user");
    vi.stubEnv("DHL_PASSWORD", "password");
    vi.stubEnv("DHL_ACCOUNT_NUMBER", "524123");
    vi.stubEnv("DHL_BASE_URL", "https://example.test/sndpt/");
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(
      "<Envelope><Body><PickUpResponse><ConfirmationNumber>PU-123</ConfirmationNumber></PickUpResponse></Body></Envelope>",
      { status: 200 },
    ));
    await expect(requestDhlPickup(request, fetcher)).resolves.toMatchObject({
      confirmationNumber: "PU-123",
    });
  });
});
