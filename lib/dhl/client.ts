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

export class DhlApiError extends Error {
  constructor(
    message: string,
    public readonly details: {
      kind: "configuration" | "network" | "http" | "soap" | "api" | "parse";
      status?: number;
      code?: string;
    },
  ) {
    super(message);
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
        });
      } catch {
        throw new DhlApiError("Unable to reach DHL.", { kind: "network" });
      }

      const responseXml = await response.text();
      let parsed: ParsedXml;
      try {
        parsed = parseDhlXml(responseXml);
      } catch (error) {
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
        throw new DhlApiError(fault.message, { kind: "soap", code: fault.code, status: response.status });
      }
      if (!response.ok) {
        throw new DhlApiError(`DHL returned HTTP ${response.status}.`, {
          kind: "http",
          status: response.status,
        });
      }

      try {
        return parse(parsed);
      } catch (error) {
        if (error instanceof DhlApiError) throw error;
        throw new DhlApiError("DHL returned an invalid response.", { kind: "parse" });
      }
    },
  };
}

export function findDhlValue(parsed: ParsedXml, names: string[]): unknown {
  return findValue(parsed, names);
}
