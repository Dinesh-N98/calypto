import { XMLParser } from "fast-xml-parser";
import type { DhlConfig } from "@/lib/config/dhl";
import { buildSoapEnvelope } from "@/lib/dhl/soap-builder";

type ParsedXml = Record<string, unknown>;

const parser = new XMLParser({
  ignoreAttributes: false,
  removeNSPrefix: true,
  trimValues: true,
  parseTagValue: false,
});
const DHL_REQUEST_TIMEOUT_MS = 15_000;
const DHL_RESPONSE_LOG_LIMIT = 4_000;

export class DhlApiError extends Error {
  constructor(
    message: string,
    public readonly details: {
      kind: "configuration" | "network" | "http" | "soap" | "api" | "parse";
      status?: number;
      code?: string;
    },
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = "DhlApiError";
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function findValue(value: unknown, names: string[]): unknown {
  const record = asRecord(value);
  if (!record) return undefined;
  for (const [key, child] of Object.entries(record)) {
    if (names.includes(key)) return child;
    const nested = findValue(child, names);
    if (nested !== undefined) return nested;
  }
  return undefined;
}

function text(value: unknown): string | undefined {
  if (typeof value === "string" || typeof value === "number") return String(value);
  const record = asRecord(value);
  if (!record) return undefined;
  for (const key of ["Text", "Message", "Description", "faultstring"]) {
    if (typeof record[key] === "string") return record[key];
  }
  return undefined;
}

function responseExcerpt(value: string): string {
  return value.length <= DHL_RESPONSE_LOG_LIMIT
    ? value
    : `${value.slice(0, DHL_RESPONSE_LOG_LIMIT)}...[truncated]`;
}

export function parseDhlXml(xml: string): ParsedXml {
  try {
    return parser.parse(xml) as ParsedXml;
  } catch {
    throw new DhlApiError("DHL returned malformed XML.", { kind: "parse" });
  }
}

export function parseSoapFault(parsed: ParsedXml): { code?: string; message: string } | null {
  const fault = findValue(parsed, ["Fault"]);
  if (fault === undefined) return null;
  const record = asRecord(fault);
  return {
    code: text(record?.faultcode ?? record?.Code ?? record?.ErrorCode),
    message: text(record?.faultstring ?? record?.Reason ?? record?.ErrorMessage) ?? "DHL SOAP fault.",
  };
}

export type DhlSoapClient = {
  request<T>(options: {
    endpoint: string;
    body: string;
    parse: (parsed: ParsedXml) => T;
    soapAction?: string;
  }): Promise<T>;
};

export function createDhlClient(
  config: Pick<DhlConfig, "username" | "password">,
  fetcher: typeof fetch = fetch,
): DhlSoapClient {
  return {
    async request({ endpoint, body, parse, soapAction }) {
      const requestXml = buildSoapEnvelope(body, config);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), DHL_REQUEST_TIMEOUT_MS);
      let response: Response;
      try {
        response = await fetcher(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "text/xml; charset=utf-8",
            Accept: "text/xml",
            ...(soapAction ? { SOAPAction: soapAction } : {}),
          },
          body: requestXml,
          cache: "no-store",
          signal: controller.signal,
        });
      } catch (error) {
        const message =
          error instanceof DOMException && error.name === "AbortError"
            ? "Request timed out."
            : error instanceof Error
              ? error.message
              : "Unknown network error.";
        console.error("DHL SOAP request failed to reach the endpoint.", {
          endpoint,
          message,
        });
        throw new DhlApiError(`Unable to reach DHL: ${message}`, { kind: "network" }, { cause: error });
      } finally {
        clearTimeout(timeout);
      }

      let responseXml: string;
      try {
        responseXml = await response.text();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown response read error.";
        console.error("DHL SOAP response could not be read.", {
          endpoint,
          status: response.status,
          message,
        });
        throw new DhlApiError(`Unable to read DHL response: ${message}`, {
          kind: "network",
          status: response.status,
        }, { cause: error });
      }
      let parsed: ParsedXml;
      try {
        parsed = parseDhlXml(responseXml);
      } catch (error) {
        console.error("DHL returned an unparseable SOAP response.", {
          endpoint,
          status: response.status,
          response: responseExcerpt(responseXml),
        });
        if (!response.ok) {
          throw new DhlApiError(`DHL returned HTTP ${response.status}.`, {
            kind: "http",
            status: response.status,
          });
        }
        throw error;
      }
      const fault = parseSoapFault(parsed);
      if (fault) {
        console.error("DHL SOAP fault received.", {
          endpoint,
          status: response.status,
          code: fault.code,
          message: fault.message,
          response: responseExcerpt(responseXml),
        });
        throw new DhlApiError(fault.message, {
          kind: "soap",
          code: fault.code,
          status: response.status,
        });
      }
      if (!response.ok) {
        console.error("DHL SOAP endpoint returned an HTTP error.", {
          endpoint,
          status: response.status,
          response: responseExcerpt(responseXml),
        });
        throw new DhlApiError(`DHL returned HTTP ${response.status}.`, {
          kind: "http",
          status: response.status,
        });
      }

      try {
        return parse(parsed);
      } catch (error) {
        if (error instanceof DhlApiError) throw error;
        console.error("DHL SOAP response did not contain usable rate/shipment data.", {
          endpoint,
          status: response.status,
          response: responseExcerpt(responseXml),
          message: error instanceof Error ? error.message : "Unknown parser error.",
        });
        throw new DhlApiError("DHL returned an invalid response.", { kind: "parse" });
      }
    },
  };
}

export function findDhlValue(parsed: ParsedXml, names: string[]): unknown {
  return findValue(parsed, names);
}
