import { getDhlConfig } from "@/lib/config/dhl";
import { createDhlClient, DhlApiError, findDhlValue } from "@/lib/dhl/client";
import { xmlElement } from "@/lib/dhl/soap-builder";

export type DhlAddress = {
  streetLines: string | string[];
  city: string;
  postalCode: string;
  countryCode: string;
  stateOrProvinceCode?: string;
};

export type DhlPackage = {
  weightKg: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
};

export type DhlVariantMetrics = {
  quantity: number;
  weightKg: number | null | undefined;
  lengthCm: number | null | undefined;
  widthCm: number | null | undefined;
  heightCm: number | null | undefined;
};

export type DhlRateRequest = {
  recipient: DhlAddress;
  packages: DhlPackage[];
  shipTimestamp?: Date;
};

export type DhlRate = {
  serviceCode?: string;
  serviceName?: string;
  currency: string;
  amount: number;
};

function assertPositive(value: number, name: string): void {
  if (!Number.isFinite(value) || value <= 0) throw new Error(`${name} must be greater than zero.`);
}

export function buildDhlPackage(
  variants: DhlVariantMetrics[],
  defaults = getDhlConfig().defaultPackage,
): DhlPackage {
  if (variants.length === 0) throw new Error("At least one product variant is required.");
  return {
    weightKg: variants.reduce(
      (sum, variant) => sum + (variant.weightKg ?? defaults.weightKg) * variant.quantity,
      0,
    ),
    lengthCm: Math.max(...variants.map((variant) => variant.lengthCm ?? defaults.lengthCm)),
    widthCm: Math.max(...variants.map((variant) => variant.widthCm ?? defaults.widthCm)),
    heightCm: Math.max(...variants.map((variant) => variant.heightCm ?? defaults.heightCm)),
  };
}

function formatDhlTimestamp(value: Date): string {
  if (Number.isNaN(value.getTime())) throw new Error("shipTimestamp must be a valid date.");
  return value.toISOString().replace("Z", "GMT+00:00");
}

export function buildRateRequestBody(
  request: DhlRateRequest,
  shipper: Pick<ReturnType<typeof getDhlConfig>, "shipper" | "accountNumber">,
): string {
  const recipientPostalCode = request.recipient.postalCode.trim().replace(/\s+/g, " ").toUpperCase();
  const recipientStateOrProvinceCode = request.recipient.stateOrProvinceCode?.trim();
  if (!request.recipient.countryCode || !request.recipient.city || !recipientPostalCode) {
    throw new Error("recipient city and countryCode are required.");
  }
  if (request.packages.length === 0) throw new Error("At least one package is required.");
  request.packages.forEach((pkg, index) => {
    assertPositive(pkg.weightKg, `packages[${index}].weightKg`);
    assertPositive(pkg.lengthCm, `packages[${index}].lengthCm`);
    assertPositive(pkg.widthCm, `packages[${index}].widthCm`);
    assertPositive(pkg.heightCm, `packages[${index}].heightCm`);
  });

  const packages = request.packages
    .map((pkg, index) => {
      return `<RequestedPackages number="${index + 1}"><Weight>${xmlElement("Value", pkg.weightKg)}</Weight><Dimensions>${xmlElement("Length", pkg.lengthCm)}${xmlElement("Width", pkg.widthCm)}${xmlElement("Height", pkg.heightCm)}</Dimensions></RequestedPackages>`;
    })
    .join("");

  const streetLines = (Array.isArray(request.recipient.streetLines)
    ? request.recipient.streetLines
    : [request.recipient.streetLines]).filter((line): line is string => typeof line === "string");
  const streetXml = streetLines.map((line) => xmlElement("StreetLines", line)).join("");
  const shipperXml = [
    xmlElement("StreetLines", shipper.shipper.streetLines),
    xmlElement("City", shipper.shipper.city),
    xmlElement("StateOrProvinceCode", shipper.shipper.stateOrProvinceCode),
    xmlElement("PostalCode", shipper.shipper.postalCode),
    xmlElement("CountryCode", shipper.shipper.countryCode),
  ].join("");
  const recipientXml = [
    streetXml,
    xmlElement("City", request.recipient.city),
    xmlElement("PostalCode", recipientPostalCode),
    xmlElement("StateOrProvinceCode", recipientStateOrProvinceCode),
    xmlElement("CountryCode", request.recipient.countryCode),
  ].join("");
  return `<rat:RateRequest xmlns:rat="http://scxgxtt.phx-dc.dhl.com/euExpressRateBook/RateMsgRequest"><ClientDetail/><RequestedShipment><DropOffType>REQUEST_COURIER</DropOffType><ServiceType>P</ServiceType><NextBusinessDay>N</NextBusinessDay><Ship><Shipper>${shipperXml}</Shipper><Recipient>${recipientXml}</Recipient></Ship><Packages>${packages}</Packages>${xmlElement("ShipTimestamp", formatDhlTimestamp(request.shipTimestamp ?? new Date()))}${xmlElement("UnitOfMeasurement", "SI")}${xmlElement("Content", "NON_DOCUMENTS")}${xmlElement("PaymentInfo", "DDU")}${xmlElement("Account", shipper.accountNumber)}</RequestedShipment></rat:RateRequest>`;
}

function numberValue(value: unknown): number | undefined {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function textValue(value: unknown): string | undefined {
  return typeof value === "string" || typeof value === "number"
    ? String(value).trim() || undefined
    : undefined;
}

function rateAmount(record: Record<string, unknown>): number | undefined {
  const totalNet = asRecord(record.TotalNet);
  return numberValue(totalNet?.Amount ?? record.TotalAmount ?? record.Amount);
}

function rateCurrency(record: Record<string, unknown>): string {
  const totalNet = asRecord(record.TotalNet);
  return textValue(totalNet?.Currency ?? record.CurrencyCode ?? record.Currency) ?? "USD";
}

function rateServiceName(record: Record<string, unknown>): string | undefined {
  const charges = asRecord(record.Charges);
  const charge = asRecord(charges?.Charge);
  return textValue(record.ServiceTypeName ?? charge?.ChargeType);
}

function rateNotification(parsed: Record<string, unknown>): { code?: string; message?: string } {
  const notification = asRecord(findDhlValue(parsed, ["Notification"]));
  if (!notification) return {};
  return {
    code: textValue(notification["@_code"] ?? notification.code),
    message: textValue(notification.Message),
  };
}

export async function getDHLRates(
  request: DhlRateRequest,
  fetcher?: typeof fetch,
): Promise<DhlRate[]> {
  let config: ReturnType<typeof getDhlConfig>;
  try {
    config = getDhlConfig();
  } catch (error) {
    const message = error instanceof Error ? error.message : "DHL configuration is invalid.";
    console.error("DHL rate configuration is invalid.", { message });
    throw new DhlApiError(message, { kind: "configuration" }, { cause: error });
  }
  const client = createDhlClient(config, fetcher);
  return client.request({
    endpoint: config.endpoints.rate,
    body: buildRateRequestBody(request, config),
    parse: (parsed) => {
      const rawRates = findDhlValue(parsed, ["Rate", "Service"]);
      const candidates = Array.isArray(rawRates) ? rawRates : rawRates ? [rawRates] : [];
      const rates = candidates.flatMap((candidate) => {
        const record = asRecord(candidate);
        if (!record) return [];
        const amount = rateAmount(record);
        const currency = rateCurrency(record);
        return amount === undefined ? [] : [{
          serviceCode: textValue(record.ServiceType ?? record["@_type"]),
          serviceName: rateServiceName(record),
          currency,
          amount,
        }];
      });
      if (rates.length === 0) {
        const notification = rateNotification(parsed);
        const detail = notification.message ? ` ${notification.message}` : "";
        throw new DhlApiError(
          `DHL returned no usable rate.${detail}`,
          { kind: "api", code: notification.code },
        );
      }
      return rates;
    },
  });
}
