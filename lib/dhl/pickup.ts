import { getDhlConfig } from "@/lib/config/dhl";
import { createDhlClient, DhlApiError, findDhlValue } from "@/lib/dhl/client";
import { xmlElement } from "@/lib/dhl/soap-builder";

export type DhlPickupRequest = {
  pickupTimestamp: Date;
  pickupLocationCloseTime: string;
  pickupLocation: string;
  specialInstruction?: string;
  shipper: {
    personName: string;
    companyName: string;
    phoneNumber: string;
    emailAddress: string;
    streetLines: string;
    city: string;
    postalCode: string;
    countryCode: string;
  };
  packages: {
    weightKg: number;
    lengthCm: number;
    widthCm: number;
    heightCm: number;
    customerReference?: string;
  }[];
};

export type DhlPickupResult = {
  confirmationNumber: string;
  rawResponse: Record<string, unknown>;
};

function timestamp(value: Date): string {
  if (Number.isNaN(value.getTime())) throw new Error("pickupTimestamp must be a valid date.");
  return value.toISOString().replace("Z", "GMT+00:00");
}

export function buildPickupRequestBody(
  request: DhlPickupRequest,
  accountNumber: string,
): string {
  if (!request.packages.length) throw new Error("At least one pickup package is required.");
  if (!request.shipper.phoneNumber || !request.shipper.emailAddress) {
    throw new Error("Pickup shipper phone and email are required.");
  }
  const packages = request.packages.map((pkg, index) => {
    if ([pkg.weightKg, pkg.lengthCm, pkg.widthCm, pkg.heightCm].some((value) => !Number.isFinite(value) || value <= 0)) {
      throw new Error(`packages[${index}] must contain positive dimensions and weight.`);
    }
    return `<RequestedPackages number="${index + 1}"><Weight>${xmlElement("Value", pkg.weightKg)}</Weight><Dimensions>${xmlElement("Length", pkg.lengthCm)}${xmlElement("Width", pkg.widthCm)}${xmlElement("Height", pkg.heightCm)}</Dimensions>${xmlElement("CustomerReferences", pkg.customerReference)}</RequestedPackages>`;
  }).join("");
  const shipperAddress = [
    xmlElement("StreetLines", request.shipper.streetLines),
    xmlElement("City", request.shipper.city),
    xmlElement("PostalCode", request.shipper.postalCode),
    xmlElement("CountryCode", request.shipper.countryCode),
  ].join("");
  const contact = [
    xmlElement("PersonName", request.shipper.personName),
    xmlElement("CompanyName", request.shipper.companyName),
    xmlElement("PhoneNumber", request.shipper.phoneNumber),
    xmlElement("EmailAddress", request.shipper.emailAddress),
  ].join("");

  return `<ns0:PickUpRequest xmlns:ns0="http://scxgxtt.phx-dc.dhl.com/euExpressRateBook/PickUpRequest"><PickUpShipment><ShipmentInfo><ServiceType>U</ServiceType><Billing>${xmlElement("ShipperAccountNumber", accountNumber)}${xmlElement("ShippingPaymentType", "S")}${xmlElement("BillingAccountNumber", accountNumber)}</Billing><UnitOfMeasurement>SI</UnitOfMeasurement></ShipmentInfo>${xmlElement("PickupTimestamp", timestamp(request.pickupTimestamp))}${xmlElement("PickupLocationCloseTime", request.pickupLocationCloseTime)}${xmlElement("SpecialPickupInstruction", request.specialInstruction)}${xmlElement("PickupLocation", request.pickupLocation)}<InternationalDetail><Commodities>${xmlElement("NumberOfPieces", request.packages.length)}${xmlElement("Description", "Calypto Bait shipment")}</Commodities></InternationalDetail><Ship><Shipper><Contact>${contact}</Contact><Address>${shipperAddress}</Address></Shipper><Pickup><Contact>${contact}</Contact><Address>${shipperAddress}</Address></Pickup></Ship><Packages>${packages}</Packages></PickUpShipment></ns0:PickUpRequest>`;
}

function pickupResult(parsed: Record<string, unknown>): DhlPickupResult {
  const value = findDhlValue(parsed, [
    "ConfirmationNumber",
    "PickupConfirmationNumber",
    "ConfirmationID",
    "Confirmation",
  ]);
  if (typeof value !== "string" || !value.trim()) {
    throw new DhlApiError("DHL did not return a pickup confirmation number.", { kind: "api" });
  }
  return { confirmationNumber: value.trim(), rawResponse: parsed };
}

export async function requestDhlPickup(
  request: DhlPickupRequest,
  fetcher?: typeof fetch,
): Promise<DhlPickupResult> {
  const config = getDhlConfig();
  return createDhlClient(config, fetcher).request({
    endpoint: config.endpoints.pickup,
    body: buildPickupRequestBody(request, config.accountNumber),
    parse: pickupResult,
  });
}
