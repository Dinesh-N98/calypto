import { toPayPalAmount } from "@/lib/paypal";

type JsonObject = Record<string, unknown>;

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function getPayPalPurchaseUnit(
  value: JsonObject,
  attempt: {
    providerOrderId: string | null;
    orderId: string;
    amountCents: number;
    currency: string;
    order: { providerReference: string };
  },
): JsonObject | null {
  if (value.id !== attempt.providerOrderId || !Array.isArray(value.purchase_units)) return null;
  const unit = value.purchase_units.find(
    (candidate): candidate is JsonObject =>
      isObject(candidate) &&
      candidate.custom_id === attempt.orderId &&
      candidate.invoice_id === attempt.order.providerReference,
  );
  if (
    !unit ||
    !isObject(unit.amount) ||
    unit.amount.value !== toPayPalAmount(attempt.amountCents) ||
    unit.amount.currency_code !== attempt.currency
  ) {
    return null;
  }
  return unit;
}

export function getPayPalCapture(
  purchaseUnit: JsonObject,
  captureId: string,
  expectedStatus: string,
  amountCents: number,
  currency: string,
): JsonObject | null {
  if (!isObject(purchaseUnit.payments) || !Array.isArray(purchaseUnit.payments.captures)) {
    return null;
  }
  const capture = purchaseUnit.payments.captures.find(
    (candidate): candidate is JsonObject =>
      isObject(candidate) && candidate.id === captureId && candidate.status === expectedStatus,
  );
  if (
    !capture ||
    !isObject(capture.amount) ||
    capture.amount.value !== toPayPalAmount(amountCents) ||
    capture.amount.currency_code !== currency
  ) {
    return null;
  }
  return capture;
}

export function validatePayPalCapture(
  value: JsonObject,
  captureId: string,
  expectedStatus: string[],
  amountCents: number,
  currency: string,
): boolean {
  return (
    value.id === captureId &&
    typeof value.status === "string" &&
    expectedStatus.includes(value.status) &&
    isObject(value.amount) &&
    value.amount.value === toPayPalAmount(amountCents) &&
    value.amount.currency_code === currency
  );
}

export function paypalAmountToCents(value: unknown): number | null {
  if (typeof value !== "string" || !/^\d{1,10}\.\d{2}$/u.test(value)) return null;
  const [major, minor] = value.split(".");
  const cents = Number(major) * 100 + Number(minor);
  return Number.isSafeInteger(cents) ? cents : null;
}

export function getCaptureOrderId(value: JsonObject): string | null {
  const supplementary = isObject(value.supplementary_data) ? value.supplementary_data : null;
  const related = supplementary && isObject(supplementary.related_ids)
    ? supplementary.related_ids
    : null;
  return typeof related?.order_id === "string" ? related.order_id : null;
}
