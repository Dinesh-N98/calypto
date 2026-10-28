import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  applyRateLimit,
  rateLimitResponse,
  readJsonBody,
  RequestBodyError,
} from "@/lib/request-security";
import {
  getNewsletterDiscountLookupStatus,
  normalizeNewsletterDiscountCode,
  type NewsletterDiscountLookupStatus,
} from "@/lib/newsletter/discount-redemption";
import { normalizeNewsletterEmail } from "@/lib/newsletter/subscriptions";
import { sendContactInquiryNotification } from "@/lib/contact-notification";

type ContactBody = {
  name?: unknown;
  email?: unknown;
  message?: unknown;
  discountCode?: unknown;
};

function isRecord(value: unknown): value is ContactBody {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function noStoreJson(
  body: Record<string, unknown>,
  status: number,
): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(request: Request) {
  const limit = await applyRateLimit(request, "contact-inquiry", 5, 600);
  if (!limit.allowed) return rateLimitResponse(limit);

  let body: unknown;
  try {
    body = await readJsonBody(request, 16_384);
  } catch (error) {
    if (error instanceof RequestBodyError) {
      return noStoreJson({ error: error.message }, error.status);
    }
    console.error("Unable to read contact inquiry request.");
    return noStoreJson({ error: "Unable to send your message." }, 400);
  }

  if (!isRecord(body)) {
    return noStoreJson({ error: "Name, email, and message are required." }, 400);
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = normalizeNewsletterEmail(body.email);
  const message = typeof body.message === "string" ? body.message.trim() : "";
  const submittedCode =
    typeof body.discountCode === "string" ? body.discountCode.trim().toUpperCase() : "";

  if (
    !name ||
    name.length > 120 ||
    !email ||
    !message ||
    message.length > 10_000 ||
    submittedCode.length > 32
  ) {
    return noStoreJson({ error: "Name, email, and message are required." }, 400);
  }

  try {
    let discountCode: string | null = null;
    let discountCodeStatus: NewsletterDiscountLookupStatus | null = null;
    let discountSubscriberEmail: string | null = null;
    let discountPercent: number | null = null;

    if (submittedCode) {
      discountCode = submittedCode;
      const normalizedCode = normalizeNewsletterDiscountCode(submittedCode);
      const subscription = await prisma.newsletterSubscription.findUnique({
        where: { discountCode: normalizedCode ?? "__INVALID_NEWSLETTER_CODE__" },
        select: {
          id: true,
          email: true,
          status: true,
          discountPercent: true,
          discountRedeemedAt: true,
        },
      });
      discountCodeStatus = getNewsletterDiscountLookupStatus(subscription, email);
      if (discountCodeStatus === "EMAIL_MISMATCH") {
        return noStoreJson(
          { error: "This discount code is tied to a different email address." },
          400,
        );
      }
      discountSubscriberEmail = subscription?.email ?? null;
      discountPercent = subscription?.discountPercent ?? null;
    }

    const lead = await prisma.lead.create({
      data: {
        type: "contact",
        name,
        email,
        message,
        discountCode,
        discountCodeStatus,
        discountSubscriberEmail,
        discountPercent,
      },
      select: { id: true, createdAt: true },
    });

    try {
      const emailResult = await sendContactInquiryNotification({
        leadId: lead.id,
        name,
        email,
        message,
        createdAt: lead.createdAt,
        discountCode,
        discountCodeStatus,
        discountSubscriberEmail,
        discountPercent,
      });
      if (emailResult === "skipped") {
        console.warn("Contact inquiry notification skipped: OWNER_NOTIFICATION_EMAIL is unset.");
      }
    } catch {
      console.warn("Contact inquiry notification could not be sent.");
    }

    return noStoreJson(
      {
        ok: true,
        message: submittedCode
          ? "Message sent. We'll verify your code and apply it to your order."
          : "Message sent. We'll be in touch.",
      },
      201,
    );
  } catch {
    console.error("Unable to store contact inquiry.");
    return noStoreJson({ error: "Unable to send your message." }, 500);
  }
}
