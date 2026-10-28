import {
  applyRateLimit,
  applyRateLimitByValue,
  rateLimitResponse,
  readJsonBody,
  RequestBodyError,
} from "@/lib/request-security";
import { prisma } from "@/lib/prisma";
import { generateNewsletterDiscountCode } from "@/lib/newsletter/discount-code";
import { buildNewsletterUrl, sendNewsletterWelcomeEmail } from "@/lib/newsletter/email";
import { noStoreJson, withNoStore } from "@/lib/newsletter/http";
import {
  createNewsletterToken,
  hashNewsletterToken,
  isConfirmationTokenExpired,
  newsletterTokensMatch,
} from "@/lib/newsletter/tokens";

function isUniqueConstraintError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}

export async function POST(request: Request) {
  let ipLimit: Awaited<ReturnType<typeof applyRateLimit>>;
  try {
    ipLimit = await applyRateLimit(request, "newsletter-confirm-ip", 20, 60 * 60);
  } catch {
    console.error("Newsletter confirmation rate limit could not be checked.");
    return noStoreJson(
      { error: "Unable to confirm this subscription right now. Please try again." },
      { status: 500 },
    );
  }
  if (!ipLimit.allowed) return withNoStore(rateLimitResponse(ipLimit));

  let body: unknown;
  try {
    body = await readJsonBody(request, 2 * 1024);
  } catch (error) {
    const message =
      error instanceof RequestBodyError ? error.message : "Invalid confirmation link.";
    return noStoreJson({ error: message }, { status: 400 });
  }
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return noStoreJson({ error: "Invalid confirmation link." }, { status: 400 });
  }

  const token = (body as Record<string, unknown>).token;
  if (typeof token !== "string" || !/^[A-Za-z0-9_-]{43}$/u.test(token)) {
    return noStoreJson(
      { error: "This confirmation link is invalid or expired. Please sign up again." },
      { status: 400 },
    );
  }

  const tokenHash = hashNewsletterToken(token);
  let tokenLimit: Awaited<ReturnType<typeof applyRateLimitByValue>>;
  try {
    tokenLimit = await applyRateLimitByValue("newsletter-confirm-token", tokenHash, 10, 60 * 60);
  } catch {
    console.error("Newsletter confirmation rate limit could not be checked.");
    return noStoreJson(
      { error: "Unable to confirm this subscription right now. Please try again." },
      { status: 500 },
    );
  }
  if (!tokenLimit.allowed)
    return noStoreJson({ error: "Too many attempts. Please try again later." }, { status: 429 });

  try {
    const subscription = await prisma.newsletterSubscription.findUnique({
      where: { confirmationTokenHash: tokenHash },
      select: {
        id: true,
        email: true,
        status: true,
        confirmationTokenHash: true,
        confirmationSentAt: true,
        confirmedAt: true,
        discountCode: true,
        unsubscribeTokenHash: true,
      },
    });

    if (
      !subscription ||
      !subscription.confirmationTokenHash ||
      !newsletterTokensMatch(subscription.confirmationTokenHash, tokenHash)
    ) {
      return noStoreJson(
        { error: "This confirmation link is invalid or expired. Please sign up again." },
        { status: 400 },
      );
    }

    if (subscription.status === "CONFIRMED" && subscription.discountCode) {
      return noStoreJson({ ok: true, discountCode: subscription.discountCode });
    }
    if (
      subscription.status !== "PENDING_CONFIRMATION" ||
      isConfirmationTokenExpired(subscription.confirmationSentAt)
    ) {
      return noStoreJson(
        { error: "This confirmation link is invalid or expired. Please sign up again." },
        { status: 400 },
      );
    }

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const discountCode = subscription.discountCode ?? generateNewsletterDiscountCode();
      const unsubscribeToken = createNewsletterToken();
      const now = new Date();

      try {
        const result = await prisma.$transaction(async (transaction) => {
          const updated = await transaction.newsletterSubscription.updateMany({
            where: {
              id: subscription.id,
              status: "PENDING_CONFIRMATION",
              confirmationTokenHash: tokenHash,
            },
            data: {
              status: "CONFIRMED",
              confirmedAt: now,
              discountCode,
              unsubscribeTokenHash: hashNewsletterToken(unsubscribeToken),
            },
          });
          const current = await transaction.newsletterSubscription.findUnique({
            where: { id: subscription.id },
            select: { status: true, discountCode: true },
          });
          return { changed: updated.count > 0, current };
        });

        if (result.current?.status === "CONFIRMED" && result.current.discountCode) {
          if (result.changed) {
            try {
              const unsubscribeUrl = buildNewsletterUrl(
                "/newsletter/unsubscribe",
                unsubscribeToken,
              );
              await sendNewsletterWelcomeEmail({
                email: subscription.email,
                discountCode: result.current.discountCode,
                unsubscribeUrl,
              });
            } catch (error) {
              console.error("Newsletter welcome email could not be sent.", {
                name: error instanceof Error ? error.name : typeof error,
                message: error instanceof Error ? error.message : String(error),
                discountCode: result.current.discountCode,
              });
            }
          }
          return noStoreJson({ ok: true, discountCode: result.current.discountCode });
        }
        return noStoreJson(
          { error: "Unable to confirm this subscription. Please try again." },
          { status: 409 },
        );
      } catch (error) {
        if (!isUniqueConstraintError(error) || attempt === 4) throw error;
      }
    }
  } catch (error) {
    console.error("Newsletter confirmation could not be processed.", {
      name: error instanceof Error ? error.name : typeof error,
      message: error instanceof Error ? error.message : String(error),
    });
    return noStoreJson(
      { error: "Unable to confirm this subscription right now. Please try again." },
      { status: 500 },
    );
  }

  return noStoreJson(
    { error: "Unable to create a discount code. Please try again." },
    { status: 500 },
  );
}
