import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { getDhlConfig } from "@/lib/config/dhl";
import { createDhlClient, DhlApiError } from "@/lib/dhl/client";
import { buildDhlPackage, buildRateRequestBody } from "@/lib/dhl/rate";
import { buildSoapEnvelope, escapeXml } from "@/lib/dhl/soap-builder";

const config = {
  username: "sandbox-user",
  password: "p<&\"",
  accountNumber: "524123",
  baseUrl: "https://wsbexpress.dhl.com:443/sndpt",
  shipperCountry: "LK",
  shipperCity: "Colombo 02",
};

describe("DHL configuration", () => {
  it("derives endpoint URLs and validates required settings", () => {
    expect(getDhlConfig({
      DHL_USERNAME: " user ",
      DHL_PASSWORD: " password ",
      DHL_ACCOUNT_NUMBER: " account ",
      DHL_BASE_URL: "https://example.test/base/",
      DHL_SHIPPER_COUNTRY: "lk",
      DHL_SHIPPER_CITY: "Colombo",
    }).endpoints).toEqual({
      rate: "https://example.test/base/expressRateBook",
      shipment: "https://example.test/base/expressRateBook",
      pickup: "https://example.test/base/requestPickup",
      tracking: "https://example.test/base/glDHLExpressTrack",
    });
    expect(() => getDhlConfig({ DHL_USERNAME: "user" })).toThrow("DHL_PASSWORD is required");
  });
});

describe("DHL SOAP helper", () => {
  it("escapes XML values and injects WS-Security UsernameToken", () => {
    expect(escapeXml(`a<&>"'`)).toBe("a&lt;&amp;&gt;&quot;&apos;");
    const xml = buildSoapEnvelope("<test:Request/>", config);
    expect(xml).toContain("<wsse:Username>sandbox-user</wsse:Username>");
    expect(xml).toContain("<wsse:Password");
    expect(xml).toContain("p&lt;&amp;&quot;");
    expect(xml).toContain("<soapenv:Body><test:Request/></soapenv:Body>");
  });
});

describe("DHL SOAP client", () => {
  it("parses namespace-prefixed responses", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(
      `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"><soapenv:Body><x:Response xmlns:x="urn:test"><x:Value>ok</x:Value></x:Response></soapenv:Body></soapenv:Envelope>`,
      { status: 200 },
    ));
    await expect(createDhlClient(config, fetcher).request({
      endpoint: "https://example.test",
      body: "<x:Request/>",
      parse: (parsed) => parsed.Envelope,
    })).resolves.toBeTruthy();
    expect(fetcher).toHaveBeenCalledWith("https://example.test", expect.objectContaining({
      method: "POST",
      headers: expect.objectContaining({ "Content-Type": "text/xml; charset=utf-8" }),
    }));
  });

  it("normalizes SOAP faults and HTTP errors", async () => {
    const faultFetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(
      "<Envelope><Body><Fault><faultcode>Client</faultcode><faultstring>Invalid account</faultstring></Fault></Body></Envelope>",
      { status: 500 },
    ));
    await expect(createDhlClient(config, faultFetcher).request({
      endpoint: "https://example.test",
      body: "<Request/>",
      parse: () => true,
    })).rejects.toMatchObject({
      name: "DhlApiError",
      details: { kind: "soap", code: "Client", status: 500 },
      message: "Invalid account",
    });

    const httpFetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response("not xml", { status: 503 }));
    await expect(createDhlClient(config, httpFetcher).request({
      endpoint: "https://example.test",
      body: "<Request/>",
      parse: () => true,
    })).rejects.toMatchObject({ details: { kind: "http", status: 503 } });
    expect(new DhlApiError("x", { kind: "api" })).toBeInstanceOf(Error);
  });
});

describe("DHL rate request", () => {
  it("uses variant metrics and falls back per missing field", () => {
    expect(buildDhlPackage([
      {
        quantity: 2,
        weightKg: 0.15,
        lengthCm: 10.16,
        widthCm: null,
        heightCm: 2,
      },
    ], { weightKg: 0.5, lengthCm: 3, widthCm: 2, heightCm: 1 })).toEqual({
      weightKg: 0.3,
      lengthCm: 10.16,
      widthCm: 2,
      heightCm: 2,
    });
  });

  it("serializes packages and escapes recipient data", () => {
    const xml = buildRateRequestBody({
      recipient: {
        streetLines: "A&B Road",
        city: "Singapore",
        postalCode: "200001",
        countryCode: "SG",
      },
      packages: [{ weightKg: 0.5, lengthCm: 3, widthCm: 2, heightCm: 1 }],
      shipTimestamp: new Date("2026-10-15T13:00:00.000Z"),
    }, config);
    expect(xml).toContain("A&amp;B Road");
    expect(xml).toContain('RequestedPackages number="1"');
    expect(xml).toContain("<ShipTimestamp>2026-10-15T13:00:00.000GMT+00:00</ShipTimestamp>");
  });
});
