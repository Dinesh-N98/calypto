import { renderShippingEmail, type ShippingEmailDetails } from "@/lib/shipping-email-template";

const RESEND_EMAILS_URL = "https://api.resend.com/emails";

export async function sendShippingConfirmationEmail(
  recipient: string,
  details: ShippingEmailDetails,
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) {
    throw new Error("RESEND_API_KEY and EMAIL_FROM must be configured to send email.");
  }

  const { html, text } = renderShippingEmail(details);
  const response = await fetch(RESEND_EMAILS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [recipient],
      subject: `Your order ${details.orderReference} has shipped`,
      html,
      text,
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    throw new Error(`Resend email API returned HTTP ${response.status}.`);
  }
}
