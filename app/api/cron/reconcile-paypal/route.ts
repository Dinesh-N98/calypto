import { timingSafeEqual } from "node:crypto";
import { reconcileExpiredPayPalAttempts } from "@/lib/checkout/reconcile-paypal";

export const maxDuration = 300;

function isAuthorized(request: Request): boolean {
  const configuredSecret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");
  if (!configuredSecret || configuredSecret.length < 32 || !authorization) return false;
  const suppliedSecret = authorization.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : "";
  const supplied = Buffer.from(suppliedSecret);
  const expected = Buffer.from(configuredSecret);
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

export async function POST(request: Request) {
  if (!process.env.CRON_SECRET || process.env.CRON_SECRET.length < 32) {
    console.error("CRON_SECRET must be configured with at least 32 characters.");
    return Response.json({ error: "Payment reconciliation is not configured." }, { status: 503 });
  }
  if (!isAuthorized(request)) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const summary = await reconcileExpiredPayPalAttempts();
    return Response.json(summary, {
      status: summary.errors > 0 ? 503 : 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("PayPal payment reconciliation failed.", error);
    return Response.json({ error: "Payment reconciliation failed." }, { status: 500 });
  }
}
