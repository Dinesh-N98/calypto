import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
import { buildShipmentRequestBody } from "@/lib/dhl/shipment";

const request = {
  reference: "CAL-TEST",
  currency: "USD",
  shipper: {
    contact: {
      personName: "Calypto Bait",
      companyName: "Calypto Bait",
      phoneNumber: "+94112223344",
      emailAddress: "shipping@example.com",
    },
    address: {
      streetLines: "A&B Street",
      city: "Colombo 02",
      postalCode: "00200",
      countryCode: "LK",
    },
  },
  recipient: {
    contact: {
      personName: "Jane Customer",
      phoneNumber: "+14155550100",
      emailAddress: "jane@example.com",
    },
    address: {
      streetLines: "1 Main Street",
      city: "Tokyo",
      postalCode: "1000005",
      countryCode: "JP",
    },
  },
  packages: [{ weightKg: 1, lengthCm: 10, widthCm: 10, heightCm: 10 }],
  items: [{
    description: "Color Book",
    quantity: 2,
    unitPrice: 10,
    netWeightKg: 1,
    grossWeightKg: 1.1,
  }],
  customsValue: 20,
};

describe("DHL shipment request", () => {
  it("serializes the requested label templates, paperless trade, contacts, and packages", () => {
    const xml = buildShipmentRequestBody(request, "524123");
    expect(xml).toContain("ShipmentRequest");
    expect(xml).toContain("<LabelTemplate>ECOM26_84_001</LabelTemplate>");
    expect(xml).toContain("<CustomsInvoiceTemplate>COMMERCIAL_INVOICE_03</CustomsInvoiceTemplate>");
    expect(xml).toContain("<PaperlessTradeEnabled>true</PaperlessTradeEnabled>");
    expect(xml).toContain("<ShipperAccountNumber>524123</ShipperAccountNumber>");
    expect(xml).toContain("A&amp;B Street");
    expect(xml).toContain('<RequestedPackages number="1">');
  });

  it("rejects shipments without packages or line items", () => {
    expect(() => buildShipmentRequestBody({ ...request, items: [] }, "524123")).toThrow(
      "shipment item",
    );
    expect(() => buildShipmentRequestBody({ ...request, packages: [] }, "524123")).toThrow(
      "shipment package",
    );
  });
});
