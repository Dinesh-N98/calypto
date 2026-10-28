const RESEND_EMAILS_URL = "https://api.resend.com/emails";

export type ContactInquiryNotification = {
  leadId: string;
  name: string;
  email: string;
  message: string;
  createdAt: Date;
  discountCode: string | null;
  discountCodeStatus: string | null;
  discountSubscriberEmail: string | null;
  discountPercent: number | null;
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

function safeHeaderValue(value: string, maximumLength: number): string {
  return value.replace(/[\r\n]+/gu, " ").trim().slice(0, maximumLength);
}

function getLeadUrl(leadId: string): string {
  const configuredBaseUrl = process.env.APP_BASE_URL;
  if (!configuredBaseUrl) throw new Error("APP_BASE_URL is not configured.");

  const baseUrl = new URL(configuredBaseUrl);
  if (
    (baseUrl.protocol !== "https:" &&
      !(process.env.NODE_ENV !== "production" && baseUrl.hostname === "localhost")) ||
    baseUrl.username ||
    baseUrl.password
  ) {
    throw new Error("APP_BASE_URL must be a public HTTPS origin.");
  }

  const leadUrl = new URL("/admin/crm/leads", baseUrl.origin);
  leadUrl.searchParams.set("leadId", leadId);
  return leadUrl.toString();
}

export function renderContactInquiryNotification(
  details: ContactInquiryNotification,
): { subject: string; html: string; text: string; leadUrl: string } {
  const name = details.name.slice(0, 120);
  const email = details.email.slice(0, 254);
  const message = details.message.slice(0, 10_000);
  const leadUrl = getLeadUrl(details.leadId);
  const subject = safeHeaderValue(`New Calypto inquiry from ${name}`, 180);
  const escapedLeadUrl = escapeHtml(leadUrl);
  const discountDetails = details.discountCode
    ? {
        code: details.discountCode.slice(0, 32),
        status: details.discountCodeStatus?.slice(0, 32) ?? "UNKNOWN",
        issuedTo: details.discountSubscriberEmail?.slice(0, 254) ?? "Not found",
        percent:
          typeof details.discountPercent === "number" &&
          Number.isFinite(details.discountPercent) &&
          details.discountPercent > 0 &&
          details.discountPercent <= 100
            ? details.discountPercent
            : 15,
      }
    : null;

  const discountHtml = discountDetails
    ? `<section><h2>Newsletter discount code</h2><p><strong>Code:</strong> ${escapeHtml(discountDetails.code)}</p><p><strong>Lookup status:</strong> ${escapeHtml(discountDetails.status)}</p><p><strong>Issued to:</strong> ${escapeHtml(discountDetails.issuedTo)}</p><p><strong>Rate:</strong> ${discountDetails.percent}%</p><p>Product subtotal only, not shipping/tax; first order only; verify before redeeming.</p></section>`
    : "";
  const discountText = discountDetails
    ? `\n\nNewsletter discount code\nCode: ${discountDetails.code}\nLookup status: ${discountDetails.status}\nIssued to: ${discountDetails.issuedTo}\nRate: ${discountDetails.percent}%\nProduct subtotal only, not shipping/tax; first order only; verify before redeeming.`
    : "";

  return {
    subject,
    leadUrl,
    html: `<!doctype html><html lang="en"><body style="font-family:Arial,sans-serif;color:#171a14"><main style="max-width:640px;margin:32px auto;padding:24px"><h1>New Calypto inquiry</h1><p><strong>Customer:</strong> ${escapeHtml(name)}</p><p><strong>Email:</strong> <a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></p><p><strong>Received:</strong> ${escapeHtml(details.createdAt.toISOString())}</p><h2>Message</h2><p style="white-space:pre-wrap">${escapeHtml(message)}</p>${discountHtml}<p><a href="${escapedLeadUrl}">Open lead in admin CRM</a></p></main></body></html>`,
    text: `New Calypto inquiry\n\nCustomer: ${name}\nEmail: ${email}\nReceived: ${details.createdAt.toISOString()}\n\nMessage\n${message}${discountText}\n\nOpen lead in admin CRM: ${leadUrl}`,
  };
}

export async function sendContactInquiryNotification(
  details: ContactInquiryNotification,
): Promise<"sent" | "skipped"> {
  const ownerEmail = process.env.OWNER_NOTIFICATION_EMAIL;
  if (!ownerEmail) return "skipped";

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (
    !apiKey ||
    !from ||
    /[\r\n]/u.test(ownerEmail) ||
    /[\r\n]/u.test(from) ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(ownerEmail)
  ) {
    throw new Error("Contact notification email configuration is invalid.");
  }

  const content = renderContactInquiryNotification(details);
  const response = await fetch(RESEND_EMAILS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: safeHeaderValue(from, 254),
      to: [safeHeaderValue(ownerEmail, 254)],
      reply_to: safeHeaderValue(details.email, 254),
      subject: content.subject,
      html: content.html,
      text: content.text,
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    throw new Error(`Resend contact notification returned HTTP ${response.status}.`);
  }
  return "sent";
}
