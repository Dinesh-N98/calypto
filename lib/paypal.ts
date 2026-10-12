import "server-only";

type JsonObject = Record<string, unknown>;

type PayPalConfig = {
  clientId: string;
  clientSecret: string;
  apiBaseUrl: string;
};

let cachedAccessToken: { value: string; expiresAt: number } | null = null;

export class PayPalApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "PayPalApiError";
  }
}

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function getPayPalConfig(): PayPalConfig {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  const environment = process.env.PAYPAL_ENVIRONMENT ?? "sandbox";
  if (!clientId || !clientSecret) {
    throw new Error("PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET are required.");
  }
  const publicClientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
  if (publicClientId && publicClientId !== clientId) {
    throw new Error("NEXT_PUBLIC_PAYPAL_CLIENT_ID must match PAYPAL_CLIENT_ID.");
  }
  if (environment !== "sandbox" && environment !== "live") {
    throw new Error("PAYPAL_ENVIRONMENT must be 'sandbox' or 'live'.");
  }
  return {
    clientId,
    clientSecret,
    apiBaseUrl:
      environment === "live"
        ? "https://api-m.paypal.com"
        : "https://api-m.sandbox.paypal.com",
  };
}

export function assertPayPalConfigured(): void {
  getPayPalConfig();
  if (!process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID) {
    throw new Error("NEXT_PUBLIC_PAYPAL_CLIENT_ID is required to load the PayPal JS SDK.");
  }
}

async function getAccessToken(config: PayPalConfig): Promise<string> {
  if (cachedAccessToken && cachedAccessToken.expiresAt > Date.now() + 30_000) {
    return cachedAccessToken.value;
  }

  const response = await fetch(`${config.apiBaseUrl}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  const result: unknown = await response.json().catch(() => null);
  if (
    !response.ok ||
    !isObject(result) ||
    typeof result.access_token !== "string" ||
    typeof result.expires_in !== "number"
  ) {
    throw new PayPalApiError("Unable to authenticate with PayPal.", response.status || 502);
  }
  cachedAccessToken = {
    value: result.access_token,
    expiresAt: Date.now() + result.expires_in * 1000,
  };
  return cachedAccessToken.value;
}

async function paypalRequest(
  path: string,
  {
    method,
    body,
    requestId,
  }: { method: "GET" | "POST"; body?: JsonObject; requestId?: string },
): Promise<JsonObject> {
  const config = getPayPalConfig();
  const token = await getAccessToken(config);
  const response = await fetch(`${config.apiBaseUrl}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(requestId ? { "PayPal-Request-Id": requestId } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });
  const result: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    throw new PayPalApiError(
      "PayPal rejected the payment request.",
      response.status || 502,
    );
  }
  if (!isObject(result)) {
    throw new PayPalApiError("PayPal returned an invalid response.", 502);
  }
  return result;
}

export function toPayPalAmount(amountCents: number): string {
  if (!Number.isSafeInteger(amountCents) || amountCents < 1) {
    throw new Error("PayPal amount must be a positive safe integer in cents.");
  }
  return (amountCents / 100).toFixed(2);
}

export async function createPayPalOrder({
  reference,
  orderId,
  amountCents,
  currency,
  requestId,
  shipping,
}: {
  reference: string;
  orderId: string;
  amountCents: number;
  currency: string;
  requestId: string;
  shipping: {
    fullName: string;
    addressLine1: string;
    addressLine2: string | null;
    city: string;
    state: string;
    postalCode: string;
    countryCode: string;
  };
}): Promise<JsonObject> {
  return paypalRequest("/v2/checkout/orders", {
    method: "POST",
    requestId,
    body: {
      intent: "CAPTURE",
      purchase_units: [
        {
          invoice_id: reference,
          custom_id: orderId,
          amount: { currency_code: currency, value: toPayPalAmount(amountCents) },
          shipping: {
            name: { full_name: shipping.fullName },
            address: {
              address_line_1: shipping.addressLine1,
              ...(shipping.addressLine2 ? { address_line_2: shipping.addressLine2 } : {}),
              admin_area_2: shipping.city,
              admin_area_1: shipping.state,
              postal_code: shipping.postalCode,
              country_code: shipping.countryCode,
            },
          },
        },
      ],
      payment_source: {
        paypal: {
          experience_context: {
            user_action: "PAY_NOW",
            shipping_preference: "SET_PROVIDED_ADDRESS",
          },
        },
      },
    },
  });
}

export async function capturePayPalOrder(
  orderId: string,
  requestId: string,
): Promise<JsonObject> {
  return paypalRequest(`/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, {
    method: "POST",
    requestId,
    body: {},
  });
}

export async function getPayPalOrder(orderId: string): Promise<JsonObject> {
  return paypalRequest(`/v2/checkout/orders/${encodeURIComponent(orderId)}`, {
    method: "GET",
  });
}

export async function getPayPalCapture(captureId: string): Promise<JsonObject> {
  return paypalRequest(`/v2/payments/captures/${encodeURIComponent(captureId)}`, {
    method: "GET",
  });
}

export async function verifyPayPalWebhook({
  headers,
  webhookEvent,
}: {
  headers: Headers;
  webhookEvent: JsonObject;
}): Promise<boolean> {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (!webhookId) throw new Error("PAYPAL_WEBHOOK_ID is required.");
  const transmissionId = headers.get("paypal-transmission-id");
  const transmissionTime = headers.get("paypal-transmission-time");
  const transmissionSignature = headers.get("paypal-transmission-sig");
  const certUrl = headers.get("paypal-cert-url");
  const authAlgorithm = headers.get("paypal-auth-algo");
  if (
    !transmissionId ||
    !transmissionTime ||
    !transmissionSignature ||
    !certUrl ||
    !authAlgorithm
  ) {
    return false;
  }

  const result = await paypalRequest("/v1/notifications/verify-webhook-signature", {
    method: "POST",
    body: {
      auth_algo: authAlgorithm,
      cert_url: certUrl,
      transmission_id: transmissionId,
      transmission_sig: transmissionSignature,
      transmission_time: transmissionTime,
      webhook_id: webhookId,
      webhook_event: webhookEvent,
    },
  });
  return result.verification_status === "SUCCESS";
}
