import {
  applyRateLimit,
  applyRateLimitByValue,
  rateLimitResponse,
  readJsonBody,
  RequestBodyError,
} from "@/lib/request-security";
import { prisma } from "@/lib/prisma";
import { noStoreJson, withNoStore } from "@/lib/newsletter/http";
import { hashNewsletterToken, newsletterTokensMatch } from "@/lib/newsletter/tokens";

export async function POST(request: Request) {
  let ipLimit: Awaited<ReturnType<typeof applyRateLimit>>;
  try {
    ipLimit = await applyRateLimit(request, "newsletter-unsubscribe-ip", 20, 60 * 60);
  } catch {
    console.error("Newsletter unsubscribe rate limit could not be checked.");
    return noStoreJson(
      { error: "Unable to process your request right now. Please try again." },
      { status: 500 },
    );
  }
  if (!ipLimit.allowed) return withNoStore(rateLimitResponse(ipLimit));

  let body: unknown;
  try {
    body = await readJsonBody(request, 2 * 1024);
  } catch (error) {
    const message = error instanceof RequestBodyError ? error.message : "Invalid unsubscribe link.";
    return noStoreJson({ error: message }, { status: 400 });
  }
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return noStoreJson({ error: "Invalid unsubscribe link." }, { status: 400 });
  }

  const token = (body as Record<string, unknown>).token;
  if (typeof token !== "string" || !/^[A-Za-z0-9_-]{43}$/u.test(token)) {
    return noStoreJson({ error: "This unsubscribe link is invalid." }, { status: 400 });
  }
  const tokenHash = hashNewsletterToken(token);
  let tokenLimit: Awaited<ReturnType<typeof applyRateLimitByValue>>;
  try {
    tokenLimit = await applyRateLimitByValue(
      "newsletter-unsubscribe-token",
      tokenHash,
      10,
      60 * 60,
    );
  } catch {
    console.error("Newsletter unsubscribe rate limit could not be checked.");
    return noStoreJson(
      { error: "Unable to process your request right now. Please try again." },
      { status: 500 },
    );
  }
  if (!tokenLimit.allowed) {
    return noStoreJson({ error: "Too many attempts. Please try again later." }, { status: 429 });
  }

  try {
    const subscription = await prisma.newsletterSubscription.findUnique({
      where: { unsubscribeTokenHash: tokenHash },
      select: {
        id: true,
        status: true,
        unsubscribeTokenHash: true,
      },
    });
    if (
      !subscription ||
      !subscription.unsubscribeTokenHash ||
      !newsletterTokensMatch(subscription.unsubscribeTokenHash, tokenHash)
    ) {
      return noStoreJson({ error: "This unsubscribe link is invalid." }, { status: 400 });
    }

    if (subscription.status !== "UNSUBSCRIBED") {
      await prisma.newsletterSubscription.updateMany({
        where: {
          id: subscription.id,
          status: { in: ["PENDING_CONFIRMATION", "CONFIRMED"] },
        },
        data: { status: "UNSUBSCRIBED", unsubscribedAt: new Date() },
      });
    }
    return noStoreJson({ ok: true, message: "You have been unsubscribed from Calypto emails." });
  } catch {
    console.error("Newsletter unsubscribe could not be processed.");
    return noStoreJson(
      { error: "Unable to process your request right now. Please try again." },
      { status: 500 },
    );
  }
}
