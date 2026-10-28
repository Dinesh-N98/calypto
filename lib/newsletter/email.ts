import { Resend } from "resend";

export type NewsletterEmail = {
  email: string;
  confirmationUrl: string;
};

export type NewsletterWelcomeEmail = {
  email: string;
  discountCode: string;
  unsubscribeUrl: string;
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/gu, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character] ?? character;
  });
}

export function buildNewsletterUrl(path: string, token: string): string {
  const configuredBaseUrl = process.env.APP_BASE_URL;
  if (!configuredBaseUrl) throw new Error("APP_BASE_URL is not configured.");

  const baseUrl = new URL(configuredBaseUrl);
  if (
    (baseUrl.protocol !== "https:" &&
      !(process.env.NODE_ENV !== "production" && baseUrl.hostname === "localhost")) ||
    baseUrl.username ||
    baseUrl.password ||
    baseUrl.pathname !== "/" ||
    baseUrl.search ||
    baseUrl.hash
  ) {
    throw new Error("APP_BASE_URL must be a public HTTPS origin.");
  }

  const url = new URL(path, baseUrl);
  url.searchParams.set("token", token);
  return url.toString();
}

export function renderNewsletterConfirmationEmail(confirmationUrl: string): {
  html: string;
  text: string;
} {
  const escapedUrl = escapeHtml(confirmationUrl);
  return {
    html: `<!doctype html><html lang="en"><body style="font-family:Arial,sans-serif;color:#171a14"><main style="max-width:560px;margin:32px auto;padding:24px"><h1>Confirm your Calypto subscription</h1><p>Confirm your email to receive Calypto offers, new designs, and fishing tips.</p><p><a href="${escapedUrl}" style="display:inline-block;padding:12px 18px;background:#718126;color:#fff;text-decoration:none;border-radius:6px">Confirm my subscription</a></p><p>If you did not request this, you can ignore this email.</p></main></body></html>`,
    text: `Confirm your Calypto subscription\n\nConfirm your email to receive Calypto offers, new designs, and fishing tips.\n\nConfirm here: ${confirmationUrl}\n\nIf you did not request this, you can ignore this email.`,
  };
}

export function renderNewsletterWelcomeEmail(
  discountCode: string,
  unsubscribeUrl: string,
): { html: string; text: string } {
  const escapedCode = escapeHtml(discountCode);
  const escapedUnsubscribeUrl = escapeHtml(unsubscribeUrl);
  return {
    html: `<!doctype html><html lang="en"><body style="font-family:Arial,sans-serif;color:#171a14"><main style="max-width:560px;margin:32px auto;padding:24px"><h1>Welcome to the Calypto crew</h1><p>Thanks for confirming your subscription.</p><p>Your discount code:</p><p style="display:inline-block;margin:8px 0;padding:14px 18px;border-radius:6px;background:#f1f0e8;border:1px solid #c8cbbb;color:#171a14;font-size:24px;font-weight:bold;letter-spacing:2px">${escapedCode}</p><p>15% off your first order. Applies to product subtotal only (excludes shipping and tax). Single-use only and tied to this email address.</p><p>Online checkout is not yet available; include this code in your order inquiry and we will apply it manually.</p><p>Thanks for joining us. You can <a href="${escapedUnsubscribeUrl}">unsubscribe anytime</a>.</p></main></body></html>`,
    text: `Welcome to the Calypto crew\n\nYour first-order discount code is ${discountCode}.\n\n15% off your first order. Applies to product subtotal only (excludes shipping and tax). Single-use only and tied to this email address.\n\nOnline checkout is not yet available; include this code in your order inquiry and we will apply it manually.\n\nUnsubscribe anytime: ${unsubscribeUrl}`,
  };
}

async function sendNewsletterMessage(options: {
  to: string;
  subject: string;
  html: string;
  text: string;
  unsubscribeUrl?: string;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  const replyTo = process.env.EMAIL_REPLY_TO;
  if (!apiKey || !from || !replyTo) {
    throw new Error("Newsletter email configuration is incomplete.");
  }

  if (/\r\n/u.test(from) || /\r\n/u.test(replyTo)) {
    throw new Error("Newsletter email sender configuration is invalid.");
  }

  const resend = new Resend(apiKey);
  const { data, error } = await resend.emails.send({
    from,
    replyTo,
    to: [options.to],
    subject: options.subject,
    html: options.html,
    text: options.text,
    ...(options.unsubscribeUrl
      ? { headers: { "List-Unsubscribe": `<${options.unsubscribeUrl}>` } }
      : {}),
  });

  if (error) {
    const providerError = error as Error & {
      statusCode?: number;
      code?: string;
    };
    console.error("Resend newsletter API rejected an email.", {
      subject: options.subject,
      name: providerError.name ?? "ResendError",
      message: providerError.message ?? String(error),
      statusCode: providerError.statusCode,
      code: providerError.code,
    });
    throw new Error(
      `Resend newsletter API failed${providerError.statusCode ? ` (HTTP ${providerError.statusCode})` : ""}: ${providerError.message ?? String(error)}`,
    );
  }
  if (!data?.id) {
    console.error("Resend newsletter API returned no email id.", { subject: options.subject });
    throw new Error("Resend newsletter API returned no email id.");
  }

  console.info("Resend newsletter email sent.", {
    subject: options.subject,
    emailId: data.id,
  });
}

export async function sendNewsletterConfirmationEmail(details: NewsletterEmail): Promise<void> {
  const content = renderNewsletterConfirmationEmail(details.confirmationUrl);
  await sendNewsletterMessage({
    to: details.email,
    subject: "Confirm your Calypto subscription",
    ...content,
  });
}

export async function sendNewsletterWelcomeEmail(details: NewsletterWelcomeEmail): Promise<void> {
  const content = renderNewsletterWelcomeEmail(details.discountCode, details.unsubscribeUrl);
  await sendNewsletterMessage({
    to: details.email,
    subject: "Your Calypto first-order discount code",
    unsubscribeUrl: details.unsubscribeUrl,
    ...content,
  });
}
