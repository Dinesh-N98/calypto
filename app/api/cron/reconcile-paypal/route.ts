import { timingSafeEqual } from "node:crypto";
import { reconcileExpiredPayPalAttempts } from "@/lib/checkout/reconcile-paypal";

export const maxDuration = 300;

function isAuthorized(request: Request): boolean {
  const configuredSecret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");
  if (!configuredSecret || configuredSecret.length < 32 || !authorization) return false;
  const match = /^Bearer ([^\s]+)$/u.exec(authorization);
  if (!match) return false;
  const suppliedSecret = match[1];
  const supplied = Buffer.from(suppliedSecret);
  const expected = Buffer.from(configuredSecret);
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

export async function POST(request: Request) {
  if (!process.env.CRON_SECRET || process.env.CRON_SECRET.length < 32) {
    console.error(JSON.stringify({
      event: "paypal_payment_reconciliation_rejected",
      reason: "cron_secret_missing_or_too_short",
    }));
    return Response.json(
      { error: "Payment reconciliation is not configured." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
  if (!isAuthorized(request)) {
    return Response.json(
      { error: "Unauthorized." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  const startedAt = Date.now();
  console.info(JSON.stringify({ event: "paypal_payment_reconciliation_started" }));
  try {
    const summary = await reconcileExpiredPayPalAttempts();
    const durationMs = Date.now() - startedAt;
    console.info(JSON.stringify({
      event: "paypal_payment_reconciliation_completed",
      outcome: summary.errors > 0 ? "failed" : "succeeded",
      durationMs,
      ...summary,
    }));
    return Response.json(summary, {
      status: summary.errors > 0 ? 503 : 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error(JSON.stringify({
      event: "paypal_payment_reconciliation_failed",
      durationMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : String(error),
    }));
    return Response.json(
      { error: "Payment reconciliation failed." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
