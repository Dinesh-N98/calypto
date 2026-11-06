import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { getDhlConfig } from "@/lib/config/dhl";
import { createDhlClient, DhlApiError, parseDhlXml, parseSoapFault } from "@/lib/dhl/client";
import { buildDhlPackage, buildRateRequestBody, getDHLRates } from "@/lib/dhl/rate";
import { buildSoapEnvelope, escapeXml } from "@/lib/dhl/soap-builder";

const config = {
  username: "sandbox-user",
  password: "p<&\"",
  accountNumber: "524123",
  baseUrl: "https://wsbexpress.dhl.com:443/sndpt",
  shipper: {
    streetLines: "58/3, Makandana road",
    city: "Kesbewa",
    postalCode: "10300",
    countryCode: "LK",
    phoneNumber: "+94766434416",
    emailAddress: "icalypto@gmail.com",
  },
};

describe("DHL configuration", () => {
  it("derives endpoint URLs and validates required settings", () => {
    expect(getDhlConfig({
      DHL_USERNAME: " user ",
      DHL_PASSWORD: " password ",
      DHL_ACCOUNT_NUMBER: " account ",
      DHL_BASE_URL: "https://example.test/base/",
    }).shipper).toEqual({
      streetLines: "58/3, Makandana road",
      city: "Kesbewa",
      stateOrProvinceCode: "",
      postalCode: "10300",
      countryCode: "LK",
      phoneNumber: "+94766434416",
      emailAddress: "icalypto@gmail.com",
    });
    expect(getDhlConfig({
      DHL_USERNAME: " user ",
      DHL_PASSWORD: " password ",
      DHL_ACCOUNT_NUMBER: " account ",
      DHL_BASE_URL: "https://example.test/base/",
    }).endpoints).toEqual({
      rate: "https://example.test/base/expressRateBook",
      shipment: "https://example.test/base/expressRateBook",
      pickup: "https://example.test/base/requestPickup",
      tracking: "https://example.test/base/glDHLExpressTrack",
    });
    expect(() => getDhlConfig({ DHL_USERNAME: "user" })).toThrow("DHL_PASSWORD is required");
  });

  it("defaults to DHL production endpoints when no base URL is provided", () => {
    expect(getDhlConfig({
      DHL_USERNAME: "user",
      DHL_PASSWORD: "password",
      DHL_ACCOUNT_NUMBER: "account",
    }).endpoints).toEqual({
      rate: "https://wsbexpress.dhl.com/gbl/expressRateBook",
      shipment: "https://wsbexpress.dhl.com/gbl/expressRateBook",
      pickup: "https://wsbexpress.dhl.com/gbl/requestPickup",
      tracking: "https://wsbexpress.dhl.com/gbl/glDHLExpressTrack",
    });
  });

  it("preserves password characters that dotenv treats as comment syntax when unquoted", () => {
    expect(getDhlConfig({
      DHL_USERNAME: "user",
      DHL_PASSWORD: "pass#word",
      DHL_ACCOUNT_NUMBER: "account",
    }).password).toBe("pass#word");
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

  it("surfaces DHL fault detail types such as Unauthorized", () => {
    const parsed = parseDhlXml(
      '<Envelope><Body><Fault><detail fault:type="Unauthorized" xmlns:fault="http://www.dhl.com/soapfaults"/></Fault></Body></Envelope>',
    );
    expect(parseSoapFault(parsed)).toEqual({
      code: "Unauthorized",
      message: "DHL SOAP fault: Unauthorized.",
    });
  });

  it("logs bounded raw SOAP responses for upstream failures", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const response = "<Envelope><Body><Fault><faultstring>Invalid account</faultstring></Fault></Body></Envelope>";
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(response, { status: 500 }));

    await expect(createDhlClient(config, fetcher).request({
      endpoint: "https://example.test",
      body: "<Request/>",
      parse: () => true,
    })).rejects.toBeInstanceOf(DhlApiError);

    expect(errorSpy).toHaveBeenCalledWith("DHL SOAP fault received.", expect.objectContaining({
      response,
    }));
    errorSpy.mockRestore();
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
        postalCode: "m5h 2n2",
        countryCode: "SG",
      },
      packages: [{ weightKg: 0.5, lengthCm: 3, widthCm: 2, heightCm: 1 }],
      shipTimestamp: new Date("2026-10-15T13:00:00.000Z"),
    }, config);
    expect(xml).toContain("A&amp;B Road");
    expect(xml).toContain("<StreetLines>58/3, Makandana road</StreetLines>");
    expect(xml).toContain("<City>Kesbewa</City>");
    expect(xml).toContain("<StateOrProvinceCode/>");
    expect(xml).toContain("<PostalCode>10300</PostalCode>");
    expect(xml).toContain("<CountryCode>LK</CountryCode>");
    expect(xml).toContain("<City>Singapore</City><StateOrProvinceCode/><PostalCode>M5H 2N2</PostalCode>");
    expect(xml).toContain('RequestedPackages number="1"');
    expect(xml).toContain("<ShipTimestamp>2026-10-15T13:00:00GMT+00:00</ShipTimestamp>");
  });

  it("serializes multiple street lines with DHL element names and schema order", () => {
    const xml = buildRateRequestBody({
      recipient: {
        streetLines: ["100 Queen Street West", "Suite 402", "Attn: Receiving"],
        city: "Toronto",
        postalCode: "M5H 2N2",
        stateOrProvinceCode: "ON",
        countryCode: "CA",
      },
      packages: [{ weightKg: 0.5, lengthCm: 3, widthCm: 2, heightCm: 1 }],
      shipTimestamp: new Date("2026-10-15T13:00:00.000Z"),
    }, config);

    expect(xml).toContain(
      "<StreetLines>100 Queen Street West</StreetLines>" +
        "<StreetLines2>Suite 402</StreetLines2>" +
        "<StreetLines3>Attn: Receiving</StreetLines3>" +
        "<City>Toronto</City><StateOrProvinceCode>ON</StateOrProvinceCode>" +
        "<PostalCode>M5H 2N2</PostalCode><CountryCode>CA</CountryCode>",
    );
    expect(() => buildRateRequestBody({
      recipient: {
        streetLines: ["Line 1", "Line 2", "Line 3", "Line 4"],
        city: "Toronto",
        postalCode: "M5H 2N2",
        countryCode: "CA",
      },
      packages: [{ weightKg: 0.5, lengthCm: 3, widthCm: 2, heightCm: 1 }],
    }, config)).toThrow("DHL supports up to three street address lines.");
  });
  it("parses DHL Provider Service responses from the working RateBook format", async () => {
    vi.stubEnv("DHL_USERNAME", "user");
    vi.stubEnv("DHL_PASSWORD", "password");
    vi.stubEnv("DHL_ACCOUNT_NUMBER", "524250192");
    vi.stubEnv("DHL_BASE_URL", "https://example.test/sndpt/");
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(
      `<SOAP-ENV:Envelope><SOAP-ENV:Body><RateResponse><Provider code="DHL"><Notification code="0"><Message/></Notification><Service type="P"><TotalNet><Currency>USD</Currency><Amount>17.18</Amount></TotalNet><Charges><Charge><ChargeType>EXPRESS WORLDWIDE NONDOC</ChargeType></Charge></Charges></Service></Provider></RateResponse></SOAP-ENV:Body></SOAP-ENV:Envelope>`,
      { status: 200 },
    ));

    await expect(getDHLRates({
      recipient: {
        streetLines: ["100 Queen Street West", "Suite 402"],
        city: "Toronto",
        postalCode: "M5H 2N2",
        stateOrProvinceCode: "Ontario (ON)",
        countryCode: "CA",
      },
      packages: [{ weightKg: 0.5, lengthCm: 3, widthCm: 2, heightCm: 1 }],
    }, fetcher)).resolves.toEqual([{
      serviceCode: "P",
      serviceName: "EXPRESS WORLDWIDE NONDOC",
      currency: "USD",
      amount: 17.18,
    }]);
  });

  it("reports all DHL notification codes when no service is returned", async () => {
    vi.stubEnv("DHL_USERNAME", "user");
    vi.stubEnv("DHL_PASSWORD", "password");
    vi.stubEnv("DHL_ACCOUNT_NUMBER", "524250192");
    vi.stubEnv("DHL_BASE_URL", "https://example.test/sndpt/");
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(
      `<Envelope><Body><RateResponse><Provider><Notification code="998"><Message>Invalid timestamp.</Message></Notification><Notification code="999"><Message>Process failure.</Message></Notification></Provider></RateResponse></Body></Envelope>`,
      { status: 200 },
    ));

    await expect(getDHLRates({
      recipient: {
        streetLines: "BQE Road",
        city: "Singapore",
        postalCode: "200001",
        countryCode: "SG",
      },
      packages: [{ weightKg: 0.5, lengthCm: 3, widthCm: 2, heightCm: 1 }],
    }, fetcher)).rejects.toMatchObject({
      message: "DHL returned no usable rate (DHL notification codes: 998, 999). Invalid timestamp. Process failure.",
      details: { kind: "api", code: "998" },
    });
  });
});