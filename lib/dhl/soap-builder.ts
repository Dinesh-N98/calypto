import type { DhlConfig } from "@/lib/config/dhl";

const SOAP_ENV_NS = "http://schemas.xmlsoap.org/soap/envelope/";
const WSSE_NS =
  "http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd";
const PASSWORD_TEXT_NS =
  "http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-username-token-profile-1.0#PasswordText";

export function escapeXml(value: string | number | boolean): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function xmlElement(name: string, value?: string | number | boolean | null): string {
  if (value === undefined || value === null || value === "") return `<${name}/>`;
  return `<${name}>${escapeXml(value)}</${name}>`;
}

export function buildSoapEnvelope(
  body: string,
  config: Pick<DhlConfig, "username" | "password">,
): string {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<soapenv:Envelope xmlns:soapenv="${SOAP_ENV_NS}">`,
    `<soapenv:Header><wsse:Security xmlns:wsse="${WSSE_NS}" soapenv:mustUnderstand="1">`,
    "<wsse:UsernameToken>",
    xmlElement("wsse:Username", config.username),
    `<wsse:Password Type="${PASSWORD_TEXT_NS}">${escapeXml(config.password)}</wsse:Password>`,
    "</wsse:UsernameToken></wsse:Security></soapenv:Header>",
    `<soapenv:Body>${body}</soapenv:Body>`,
    "</soapenv:Envelope>",
  ].join("");
}
