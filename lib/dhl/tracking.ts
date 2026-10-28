import { getDhlConfig } from "@/lib/config/dhl";
import { createDhlClient, findDhlValue } from "@/lib/dhl/client";
import { xmlElement } from "@/lib/dhl/soap-builder";

export type DhlTrackingEvent = {
  timestamp?: string;
  status?: string;
  description?: string;
  location?: string;
};

export type DhlTrackingResult = {
  awb: string;
  status: string;
  estimatedDeliveryDate?: string;
  events: DhlTrackingEvent[];
  rawResponse: Record<string, unknown>;
};

function text(value: unknown): string | undefined {
  return typeof value === "string" || typeof value === "number" ? String(value).trim() : undefined;
}

function collectRecords(value: unknown, names: string[], output: Record<string, unknown>[] = []) {
  if (!value || typeof value !== "object") return output;
  if (Array.isArray(value)) {
    value.forEach((item) => collectRecords(item, names, output));
    return output;
  }
  const record = value as Record<string, unknown>;
  if (Object.keys(record).some((key) => names.includes(key))) output.push(record);
  Object.values(record).forEach((item) => collectRecords(item, names, output));
  return output;
}

export function buildTrackingRequestBody(awb: string, messageTime = new Date()): string {
  if (!/^[A-Za-z0-9-]{4,30}$/u.test(awb)) throw new Error("AWB number is invalid.");
  if (Number.isNaN(messageTime.getTime())) throw new Error("messageTime must be a valid date.");
  const reference = `${Date.now()}${Math.random().toString(36).slice(2, 14)}`.slice(0, 30);
  return `<trac:trackShipmentRequest xmlns:trac="http://scxgxtt.phx-dc.dhl.com/glDHLExpressTrack/providers/services/trackShipment" xmlns:dhl="http://www.dhl.com"><trackingRequest><dhl:TrackingRequest><Request><ServiceHeader>${xmlElement("MessageTime", messageTime.toISOString())}${xmlElement("MessageReference", reference)}</ServiceHeader></Request><AWBNumber><ArrayOfAWBNumberItem>${awb}</ArrayOfAWBNumberItem></AWBNumber><LevelOfDetails>ALL_CHECK_POINTS</LevelOfDetails><PiecesEnabled>P</PiecesEnabled></dhl:TrackingRequest></trackingRequest></trac:trackShipmentRequest>`;
}

function trackingResult(parsed: Record<string, unknown>, awb: string): DhlTrackingResult {
  const status =
    text(findDhlValue(parsed, ["Status", "ShipmentStatus", "ActionStatus"])) ??
    "UNKNOWN";
  const estimatedDeliveryDate = text(findDhlValue(parsed, [
    "EstimatedDeliveryDate", "EstimatedDelivery",
  ]));
  const records = collectRecords(parsed, [
    "EventDateTime", "DateTime", "EventCode", "Description", "Action",
  ]);
  const events = records.map((record) => ({
    timestamp: text(record.EventDateTime ?? record.DateTime),
    status: text(record.EventCode ?? record.Action ?? record.Status),
    description: text(record.Description ?? record.EventDescription),
    location: text(record.ServiceArea ?? record.Location ?? record.City),
  })).filter((event) => event.timestamp || event.status || event.description || event.location);
  return { awb, status, estimatedDeliveryDate, events, rawResponse: parsed };
}

export async function getDhlTracking(
  awb: string,
  fetcher?: typeof fetch,
): Promise<DhlTrackingResult> {
  const config = getDhlConfig();
  return createDhlClient(config, fetcher).request({
    endpoint: config.endpoints.tracking,
    body: buildTrackingRequestBody(awb),
    parse: (parsed) => trackingResult(parsed, awb),
  });
}
