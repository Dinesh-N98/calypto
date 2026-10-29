import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";

export const ONEPAY_CURRENCY = "USD";
const ONEPAY_API_URL = "https://api.onepay.lk";
const ONEPAY_REQUEST_TIMEOUT_MS = 15_000;

type OnePayConfig = {
  appId: string;
  appToken: string;
  hashSalt: string;
};

type CustomerDetails = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
};

type JsonObject = Record<string, unknown>;

export class OnePayApiError extends Error {
  constructor(
    public readonly status: number,
    message = `OnePay returned HTTP ${status}.`,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = "OnePayApiError";
  }
}

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getOnePayConfig(): OnePayConfig {
  const appId = process.env.ONEPAY_APP_ID?.trim();
  const appToken = process.env.ONEPAY_APP_TOKEN?.trim();
  const hashSalt = process.env.ONEPAY_HASH_SALT?.trim();
  if (!appId || !appToken || !hashSalt) {
    throw new Error("ONEPAY_APP_ID, ONEPAY_APP_TOKEN, and ONEPAY_HASH_SALT are required.");
  }
  return { appId, appToken, hashSalt };
}

export function assertOnePayConfigured(): void {
  getOnePayConfig();
}

async function postOnePay(path: string, body: JsonObject): Promise<unknown> {
  let config: OnePayConfig;
  try {
    config = getOnePayConfig();
  } catch (error) {
    throw new OnePayApiError(500, "OnePay credentials are missing or invalid.", { cause: error });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ONEPAY_REQUEST_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(`${ONEPAY_API_URL}${path}`, {
      method: "POST",
      headers: {
        Authorization: config.appToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ app_id: config.appId, ...body }),
      cache: "no-store",
      signal: controller.signal,
    });
  } catch (error) {
    throw new OnePayApiError(
      502,
      error instanceof DOMException && error.name === "AbortError"
        ? "OnePay request timed out."
        : "Unable to reach OnePay.",
      { cause: error },
    );
  } finally {
    clearTimeout(timeout);
  }

  const responseText = await response.text().catch((error) => {
    throw new OnePayApiError(502, "Unable to read the OnePay response.", { cause: error });
  });
  if (!response.ok) {
    throw new OnePayApiError(
      response.status,
      `OnePay returned HTTP ${response.status}.`,
    );
  }

  let result: unknown;
  try {
    result = JSON.parse(responseText);
  } catch (error) {
    throw new OnePayApiError(502, "OnePay returned invalid JSON.", { cause: error });
  }
  if (!isJsonObject(result)) {
    throw new OnePayApiError(502, "OnePay returned an invalid JSON object.");
  }
  return result;
}

export async function createOnePayCheckout({
  appBaseUrl,
  amountCents,
  customer,
  reference,
}: {
  appBaseUrl: string;
  amountCents: number;
  customer: CustomerDetails;
  reference: string;
}): Promise<{ redirectUrl: unknown; transactionId: string }> {
  const config = getOnePayConfig();
  const amount = (amountCents / 100).toFixed(2);
  const hash = createHash("sha256")
    .update(`${config.appId}${ONEPAY_CURRENCY}${amount}${config.hashSalt}`)
    .digest("hex");
  const result = await postOnePay("/v3/checkout/link/", {
    amount: Number(amount),
    currency: ONEPAY_CURRENCY,
    hash,
    reference,
    customer_first_name: customer.firstName,
    customer_last_name: customer.lastName,
    customer_phone_number: customer.phone,
    customer_email: customer.email,
    transaction_redirect_url: `${appBaseUrl}/checkout/success?order=${encodeURIComponent(reference)}`,
  });

  if (
    !isJsonObject(result) ||
    typeof result.ipg_transaction_id !== "string" ||
    !result.ipg_transaction_id
  ) {
    throw new Error("OnePay did not return the documented transaction identifier.");
  }

  return { redirectUrl: result.redirect_url, transactionId: result.ipg_transaction_id };
}

export async function verifyOnePayPayment({
  transactionId,
  amountCents,
  currency,
}: {
  transactionId: string;
  amountCents: number;
  currency: string;
}): Promise<boolean> {
  const result = await postOnePay("/v3/transaction/status/", {
    onepay_transaction_id: transactionId,
  });
  if (!isJsonObject(result) || typeof result.status !== "boolean") {
    throw new Error("OnePay returned an invalid transaction status.");
  }
  if (!result.status) return false;

  if (
    result.ipg_transaction_id !== transactionId ||
    typeof result.amount !== "number" ||
    !Number.isFinite(result.amount) ||
    Math.round(result.amount * 100) !== amountCents ||
    result.currency !== currency
  ) {
    throw new Error("The verified OnePay transaction does not match the pending order.");
  }

  return true;
}

export async function refreshOnePayOrderStatus(order: {
  id: string;
  providerTransactionId: string | null;
  totalCents: number;
  currency: string;
  status: string;
}): Promise<string> {
  if (order.status !== "pending" || !order.providerTransactionId) return order.status;

  const isPaid = await verifyOnePayPayment({
    transactionId: order.providerTransactionId,
    amountCents: order.totalCents,
    currency: order.currency,
  });

  if (isPaid) {
    // Compare-and-set makes concurrent or retried callbacks idempotent and updates only status,
    // preserving user, address, and fulfillment/tracking fields.
    await prisma.order.updateMany({
      where: { id: order.id, paymentProvider: "ONEPAY", status: "pending" },
      data: { status: "paid" },
    });
  }

  const updatedOrder = await prisma.order.findUnique({
    where: { id: order.id },
    select: { status: true },
  });
  if (!updatedOrder) throw new Error("The order no longer exists.");
  return updatedOrder.status;
}
