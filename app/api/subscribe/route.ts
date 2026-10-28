import {
  applyRateLimit,
  applyRateLimitByValue,
  rateLimitResponse,
  readJsonBody,
  RequestBodyError,
} from "@/lib/request-security";
import { prisma } from "@/lib/prisma";
import { buildNewsletterUrl, sendNewsletterConfirmationEmail } from "@/lib/newsletter/email";
import { generateNewsletterDiscountCode } from "@/lib/newsletter/discount-code";
import { noStoreJson, withNoStore } from "@/lib/newsletter/http";
import {
  NEWSLETTER_CONSENT_TEXT,
  NEWSLETTER_CONSENT_VERSION,
  getNewsletterSubscriptionAction,
  normalizeNewsletterEmail,
  RESEND_COOLDOWN_MS,
} from "@/lib/newsletter/subscriptions";
import { createNewsletterToken, hashNewsletterToken } from "@/lib/newsletter/tokens";

const GENERIC_SUCCESS = {
  ok: true,
  message: "Check your inbox to confirm your subscription.",
};
const SUBSCRIBE_RATE_LIMIT = 10;
const EMAIL_RATE_LIMIT = 3;
const RATE_LIMIT_WINDOW_SECONDS = 10 * 60;

function isUniqueConstraintError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}

async function sendConfirmation(email: string, token: string): Promise<void> {
  try {
    await sendNewsletterConfirmationEmail({
      email,
      confirmationUrl: buildNewsletterUrl("/newsletter/confirm", token),
    });
  } catch (error) {
    console.error("Newsletter confirmation email could not be sent.", {
      name: error instanceof Error ? error.name : typeof error,
      message: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

export async function POST(request: Request) {
  let ipLimit: Awaited<ReturnType<typeof applyRateLimit>>;
  try {
    ipLimit = await applyRateLimit(
      request,
      "newsletter-subscribe-ip",
      SUBSCRIBE_RATE_LIMIT,
      RATE_LIMIT_WINDOW_SECONDS,
    );
  } catch {
    console.error("Newsletter signup rate limit could not be checked.");
    return noStoreJson(
      { error: "Unable to process your signup right now. Please try again." },
      { status: 500 },
    );
  }
  if (!ipLimit.allowed) return withNoStore(rateLimitResponse(ipLimit));

  let body: unknown;
  try {
    body = await readJsonBody(request, 4 * 1024);
  } catch (error) {
    if (error instanceof RequestBodyError) {
      return noStoreJson({ error: error.message }, { status: error.status });
    }
    return noStoreJson({ error: "Invalid request." }, { status: 400 });
  }

  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return noStoreJson({ error: "Invalid request." }, { status: 400 });
  }

  const payload = body as Record<string, unknown>;
  if (typeof payload.website === "string" && payload.website.trim()) {
    return noStoreJson(GENERIC_SUCCESS);
  }

  const email = normalizeNewsletterEmail(payload.email);
  if (!email) {
    return noStoreJson({ error: "Please enter a valid email address." }, { status: 400 });
  }

  let emailLimit: Awaited<ReturnType<typeof applyRateLimitByValue>>;
  try {
    emailLimit = await applyRateLimitByValue(
      "newsletter-subscribe-email",
      email,
      EMAIL_RATE_LIMIT,
      RATE_LIMIT_WINDOW_SECONDS,
    );
  } catch {
    console.error("Newsletter signup rate limit could not be checked.");
    return noStoreJson(
      { error: "Unable to process your signup right now. Please try again." },
      { status: 500 },
    );
  }
  if (!emailLimit.allowed) return noStoreJson(GENERIC_SUCCESS);

  try {
    const now = new Date();
    const existing = await prisma.newsletterSubscription.findUnique({
      where: { email },
      select: {
        id: true,
        status: true,
        confirmationSentAt: true,
        discountCode: true,
      },
    });
    const action = getNewsletterSubscriptionAction(
      existing?.status ?? null,
      existing?.confirmationSentAt ?? null,
      now,
    );
    if (action === "NOOP") return noStoreJson(GENERIC_SUCCESS);

    const token = createNewsletterToken();
    const confirmationTokenHash = hashNewsletterToken(token);

    if (action === "CREATE") {
      let created = false;
      for (let attempt = 0; attempt < 5; attempt += 1) {
        try {
          await prisma.newsletterSubscription.create({
            data: {
              email,
              status: "PENDING_CONFIRMATION",
              source: "newsletter-popup",
              consentText: NEWSLETTER_CONSENT_TEXT,
              consentVersion: NEWSLETTER_CONSENT_VERSION,
              consentAt: now,
              confirmationTokenHash,
              confirmationSentAt: now,
              discountCode: generateNewsletterDiscountCode(),
            },
          });
          created = true;
          break;
        } catch (error) {
          if (!isUniqueConstraintError(error)) throw error;
          const existingAfterCollision = await prisma.newsletterSubscription.findUnique({
            where: { email },
            select: { id: true },
          });
          if (existingAfterCollision) return noStoreJson(GENERIC_SUCCESS);
        }
      }
      if (!created) throw new Error("Unable to allocate a unique newsletter discount code.");
    } else if (action === "RESUBSCRIBE") {
      const updated = await prisma.newsletterSubscription.updateMany({
        where: { id: existing?.id, status: "UNSUBSCRIBED" },
        data: {
          status: "PENDING_CONFIRMATION",
          source: "newsletter-popup",
          consentText: NEWSLETTER_CONSENT_TEXT,
          consentVersion: NEWSLETTER_CONSENT_VERSION,
          consentAt: now,
          confirmationTokenHash,
          confirmationSentAt: now,
          confirmedAt: null,
          unsubscribedAt: null,
          discountCode: existing?.discountCode ?? generateNewsletterDiscountCode(),
        },
      });
      if (updated.count === 0) return noStoreJson(GENERIC_SUCCESS);
    } else {
      const cooldownCutoff = new Date(now.getTime() - RESEND_COOLDOWN_MS);
      const updated = await prisma.newsletterSubscription.updateMany({
        where: {
          id: existing?.id,
          status: "PENDING_CONFIRMATION",
          OR: [{ confirmationSentAt: { lte: cooldownCutoff } }, { confirmationSentAt: null }],
        },
        data: {
          confirmationTokenHash,
          confirmationSentAt: now,
          discountCode: existing?.discountCode ?? generateNewsletterDiscountCode(),
          consentText: NEWSLETTER_CONSENT_TEXT,
          consentVersion: NEWSLETTER_CONSENT_VERSION,
          consentAt: now,
        },
      });
      if (updated.count === 0) return noStoreJson(GENERIC_SUCCESS);
    }

    await sendConfirmation(email, token);
    return noStoreJson(GENERIC_SUCCESS);
  } catch (error) {
    console.error("Newsletter signup could not be processed.", {
      name: error instanceof Error ? error.name : typeof error,
      message: error instanceof Error ? error.message : String(error),
    });
    return noStoreJson(
      { error: "Unable to process your signup right now. Please try again." },
      { status: 500 },
    );
  }
}
