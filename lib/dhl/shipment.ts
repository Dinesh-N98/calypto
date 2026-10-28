import { getDhlConfig } from "@/lib/config/dhl";
import { createDhlClient, DhlApiError, findDhlValue } from "@/lib/dhl/client";
import { xmlElement } from "@/lib/dhl/soap-builder";

export type DhlShipmentAddress = {
  streetLines: string;
  city: string;
  postalCode: string;
  countryCode: string;
  stateOrProvinceCode?: string;
};

export type DhlShipmentContact = {
  personName: string;
  companyName?: string;
  phoneNumber: string;
  emailAddress: string;
};

export type DhlShipmentPackage = {
  weightKg: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
};

export type DhlShipmentItem = {
  description: string;
  quantity: number;
  unitPrice: number;
  netWeightKg: number;
  grossWeightKg: number;
  commodityCode?: string;
  manufacturingCountryCode?: string;
};

export type DhlShipmentRequest = {
  reference: string;
  shipTimestamp?: Date;
  currency: string;
  shipper: { contact: DhlShipmentContact; address: DhlShipmentAddress };
  recipient: { contact: DhlShipmentContact; address: DhlShipmentAddress };
  packages: DhlShipmentPackage[];
  items: DhlShipmentItem[];
  customsValue: number;
  destinationPort?: string;
};

export type DhlShipmentResult = {
  trackingNumber: string;
  shipmentIdentificationNumber?: string;
  shippingLabelData?: string;
  commercialInvoiceData?: string;
  rawResponse: Record<string, unknown>;
};

function assertPositive(value: number, name: string): void {
  if (!Number.isFinite(value) || value <= 0) throw new Error(`${name} must be greater than zero.`);
}

function formatDhlTimestamp(value: Date): string {
  if (Number.isNaN(value.getTime())) throw new Error("shipTimestamp must be a valid date.");
  return value.toISOString().replace("Z", "GMT+00:00");
}

function addressXml(address: DhlShipmentAddress): string {
  return [
    xmlElement("StreetLines", address.streetLines),
    xmlElement("City", address.city),
    xmlElement("StateOrProvinceCode", address.stateOrProvinceCode),
    xmlElement("PostalCode", address.postalCode),
    xmlElement("CountryCode", address.countryCode),
  ].join("");
}

function contactXml(contact: DhlShipmentContact): string {
  return [
    xmlElement("PersonName", contact.personName),
    xmlElement("CompanyName", contact.companyName),
    xmlElement("PhoneNumber", contact.phoneNumber),
    xmlElement("EmailAddress", contact.emailAddress),
  ].join("");
}

export function buildShipmentRequestBody(
  request: DhlShipmentRequest,
  accountNumber: string,
): string {
  if (!request.items.length) throw new Error("At least one shipment item is required.");
  if (!request.packages.length) throw new Error("At least one shipment package is required.");
  request.packages.forEach((pkg, index) => {
    assertPositive(pkg.weightKg, `packages[${index}].weightKg`);
    assertPositive(pkg.lengthCm, `packages[${index}].lengthCm`);
    assertPositive(pkg.widthCm, `packages[${index}].widthCm`);
    assertPositive(pkg.heightCm, `packages[${index}].heightCm`);
  });

  const exportItems = request.items.map((item, index) => `<ExportLineItem>${[
    xmlElement("CommodityCode", item.commodityCode ?? "000000"),
    xmlElement("ExportReasonType", "PERMANENT"),
    xmlElement("ItemNumber", index + 1),
    xmlElement("Quantity", item.quantity),
    xmlElement("QuantityUnitOfMeasurement", "PCS"),
    xmlElement("ItemDescription", item.description),
    xmlElement("UnitPrice", item.unitPrice),
    xmlElement("NetWeight", item.netWeightKg),
    xmlElement("GrossWeight", item.grossWeightKg),
    xmlElement("ManufacturingCountryCode", item.manufacturingCountryCode ?? "LK"),
  ].join("")}</ExportLineItem>`).join("");
  const packages = request.packages.map((pkg, index) => `<RequestedPackages number="${index + 1}">${[
    `<Weight>${xmlElement("Value", pkg.weightKg)}</Weight>`,
    `<Dimensions>${xmlElement("Length", pkg.lengthCm)}${xmlElement("Width", pkg.widthCm)}${xmlElement("Height", pkg.heightCm)}</Dimensions>`,
  ].join("")}</RequestedPackages>`).join("");

  return `<ship:ShipmentRequest xmlns:ship="http://scxgxtt.phx-dc.dhl.com/euExpressRateBook/ShipmentMsgRequest"><RequestedShipment><ShipmentInfo><DropOffType>REGULAR_PICKUP</DropOffType><ServiceType>P</ServiceType><Billing>${xmlElement("ShipperAccountNumber", accountNumber)}${xmlElement("ShippingPaymentType", "S")}${xmlElement("BillingAccountNumber", accountNumber)}</Billing><SpecialServices><Service><ServiceType>WY</ServiceType></Service></SpecialServices>${xmlElement("Currency", request.currency)}${xmlElement("UnitOfMeasurement", "SI")}<ShipmentReferences><ShipmentReference>${xmlElement("ShipmentReference", request.reference)}${xmlElement("ShipmentReferenceType", "CU")}</ShipmentReference></ShipmentReferences><LabelType>PDF</LabelType><LabelTemplate>ECOM26_84_001</LabelTemplate><ArchiveLabelTemplate>ARCH_8x4</ArchiveLabelTemplate><CustomsInvoiceTemplate>COMMERCIAL_INVOICE_03</CustomsInvoiceTemplate><PaperlessTradeEnabled>true</PaperlessTradeEnabled><LabelOptions><PrinterDPI>200</PrinterDPI><RequestWaybillDocument>Y</RequestWaybillDocument><HideAccountInWaybillDocument>N</HideAccountInWaybillDocument><NumberOfWaybillDocumentCopies>1</NumberOfWaybillDocumentCopies><RequestDHLCustomsInvoice>Y</RequestDHLCustomsInvoice><DHLCustomsInvoiceLanguageCode>eng</DHLCustomsInvoiceLanguageCode><DHLCustomsInvoiceType>COMMERCIAL_INVOICE</DHLCustomsInvoiceType></LabelOptions></ShipmentInfo>${xmlElement("ShipTimestamp", formatDhlTimestamp(request.shipTimestamp ?? new Date()))}<PaymentInfo>DAP</PaymentInfo><InternationalDetail><Commodities>${xmlElement("Description", request.items.map((item) => item.description).join(", "))}${xmlElement("CustomsValue", request.customsValue)}</Commodities><Content>NON_DOCUMENTS</Content><ExportDeclaration>${xmlElement("DestinationPort", request.destinationPort ?? request.recipient.address.city)}<ExportLineItems>${exportItems}</ExportLineItems></ExportDeclaration></InternationalDetail><Ship><Shipper><Contact>${contactXml(request.shipper.contact)}</Contact><Address>${addressXml(request.shipper.address)}</Address></Shipper><Recipient><Contact>${contactXml(request.recipient.contact)}</Contact><Address>${addressXml(request.recipient.address)}</Address></Recipient></Ship><Packages>${packages}</Packages></RequestedShipment></ship:ShipmentRequest>`;
}

function firstString(parsed: Record<string, unknown>, names: string[]): string | undefined {
  const value = findDhlValue(parsed, names);
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function responseData(parsed: Record<string, unknown>): DhlShipmentResult {
  const trackingNumber = firstString(parsed, [
    "AirwayBillNumber", "AWBNumber", "ShipmentIdentificationNumber", "TrackingNumber",
  ]);
  if (!trackingNumber) throw new DhlApiError("DHL did not return an AWB tracking number.", { kind: "api" });
  return {
    trackingNumber,
    shipmentIdentificationNumber: firstString(parsed, ["ShipmentIdentificationNumber"]),
    shippingLabelData: firstString(parsed, [
      "LabelImage", "LabelData", "AirwayBillDocument", "WaybillDocument",
    ]),
    commercialInvoiceData: firstString(parsed, [
      "CommercialInvoice", "CustomsInvoice", "CommercialInvoiceDocument",
    ]),
    rawResponse: parsed,
  };
}

export async function createDhlShipment(
  request: DhlShipmentRequest,
  fetcher?: typeof fetch,
): Promise<DhlShipmentResult> {
  const config = getDhlConfig();
  return createDhlClient(config, fetcher).request({
    endpoint: config.endpoints.shipment,
    body: buildShipmentRequestBody(request, config.accountNumber),
    parse: responseData,
  });
}
