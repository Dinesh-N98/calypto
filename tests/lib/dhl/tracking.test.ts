import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { buildTrackingRequestBody, getDhlTracking } from "@/lib/dhl/tracking";

describe("DHL tracking request", () => {
  it("serializes a valid AWB and tracking detail options", () => {
    const xml = buildTrackingRequestBody("123456789");
    expect(xml).toContain("trackShipmentRequest");
    expect(xml).toContain("<ArrayOfAWBNumberItem>123456789</ArrayOfAWBNumberItem>");
    expect(xml).toContain("<LevelOfDetails>ALL_CHECK_POINTS</LevelOfDetails>");
    expect(xml).toContain("<PiecesEnabled>P</PiecesEnabled>");
  });

  it("rejects malformed AWB values and dates", () => {
    expect(() => buildTrackingRequestBody("bad awb")).toThrow("AWB number is invalid");
    expect(() => buildTrackingRequestBody("1234", new Date("invalid"))).toThrow(
      "messageTime must be a valid date",
    );
  });

  it("parses a mocked DHL status and checkpoint", async () => {
    vi.stubEnv("DHL_USERNAME", "user");
    vi.stubEnv("DHL_PASSWORD", "password");
    vi.stubEnv("DHL_ACCOUNT_NUMBER", "524123");
    vi.stubEnv("DHL_BASE_URL", "https://example.test/sndpt/");
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(
      "<Envelope><Body><TrackingResponse><Status>In Transit</Status><EstimatedDeliveryDate>2026-11-02</EstimatedDeliveryDate><Checkpoint><EventDateTime>2026-10-28T10:00:00Z</EventDateTime><EventCode>ARRIVED</EventCode><Description>Arrived at facility</Description><Location>Singapore</Location></Checkpoint></TrackingResponse></Body></Envelope>",
      { status: 200 },
    ));
    await expect(getDhlTracking("123456789", fetcher)).resolves.toMatchObject({
      awb: "123456789",
      status: "In Transit",
      estimatedDeliveryDate: "2026-11-02",
      events: [{
        timestamp: "2026-10-28T10:00:00Z",
        status: "ARRIVED",
        description: "Arrived at facility",
        location: "Singapore",
      }],
    });
  });
});
