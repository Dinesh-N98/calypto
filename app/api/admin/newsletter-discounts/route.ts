import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { requireAdminRequest } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import {
  getNewsletterDiscountLookupStatus,
  NEWSLETTER_DISCOUNT_ELIGIBLE_STATUSES,
  normalizeNewsletterDiscountCode,
} from "@/lib/newsletter/discount-redemption";
import {
  applyRateLimit,
  rateLimitResponse,
  readJsonBody,
  RequestBodyError,
} from "@/lib/request-security";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function noStoreJson(body: Record<string, unknown>, status: number): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function GET(request: Request) {
  const authorization = await requireAdminRequest();
  if (!authorization.ok) return authorization.response;

  const rateLimit = await applyRateLimit(request, "admin-newsletter-discount-lookup", 30, 600);
  if (!rateLimit.allowed) return rateLimitResponse(rateLimit);

  const code = normalizeNewsletterDiscountCode(new URL(request.url).searchParams.get("code"));
  if (!code) return noStoreJson({ error: "Enter a valid discount code." }, 400);

  try {
    const subscription = await prisma.newsletterSubscription.findUnique({
      where: { discountCode: code },
      select: {
        id: true,
        email: true,
        status: true,
        discountCode: true,
        discountPercent: true,
        discountRedeemedAt: true,
        redeemedOrderId: true,
        redemption: {
          select: {
            redeemedAt: true,
            redeemedBy: { select: { name: true, email: true } },
            orderReference: true,
            note: true,
          },
        },
      },
    });

    return noStoreJson(
      {
        subscription: subscription
          ? {
              code: subscription.discountCode,
              email: subscription.email,
              status: subscription.status,
              discountPercent: subscription.discountPercent,
              lookupStatus: getNewsletterDiscountLookupStatus(subscription),
              redeemedAt: subscription.discountRedeemedAt,
              orderReference:
                subscription.redemption?.orderReference ?? subscription.redeemedOrderId,
              redemption: subscription.redemption
                ? {
                    redeemedAt: subscription.redemption.redeemedAt,
                    redeemedBy: subscription.redemption.redeemedBy.name ??
                      subscription.redemption.redeemedBy.email,
                    note: subscription.redemption.note,
                  }
                : null,
            }
          : null,
      },
      200,
    );
  } catch {
    console.error("Unable to look up newsletter discount.");
    return noStoreJson({ error: "Unable to look up this code." }, 500);
  }
}

export async function POST(request: Request) {
  const authorization = await requireAdminRequest();
  if (!authorization.ok) return authorization.response;

  const rateLimit = await applyRateLimit(request, "admin-newsletter-discount-redeem", 10, 600);
  if (!rateLimit.allowed) return rateLimitResponse(rateLimit);

  let body: unknown;
  try {
    body = await readJsonBody(request, 4_096);
  } catch (error) {
    if (error instanceof RequestBodyError) {
      return noStoreJson({ error: error.message }, error.status);
    }
    return noStoreJson({ error: "Request body must be valid JSON." }, 400);
  }

  if (!isRecord(body)) return noStoreJson({ error: "Redemption details are invalid." }, 400);
  const code = normalizeNewsletterDiscountCode(body.code);
  const orderReference =
    typeof body.orderReference === "string" ? body.orderReference.trim() : "";
  const note = typeof body.note === "string" ? body.note.trim() : "";
  if (!code || orderReference.length > 191 || note.length > 2_000) {
    return noStoreJson({ error: "Redemption details are invalid." }, 400);
  }

  try {
    const result = await prisma.$transaction(async (transaction) => {
      const subscription = await transaction.newsletterSubscription.findUnique({
        where: { discountCode: code },
        select: {
          id: true,
          email: true,
          status: true,
          discountCode: true,
          discountPercent: true,
          discountRedeemedAt: true,
        },
      });
      if (!subscription) return { lookupStatus: "NOT_FOUND" as const };

      const lookupStatus = getNewsletterDiscountLookupStatus(subscription);
      if (lookupStatus !== "VALID") return { lookupStatus };

      const redeemedAt = new Date();
      const update = await transaction.newsletterSubscription.updateMany({
        where: {
          id: subscription.id,
          discountRedeemedAt: null,
          status: { in: [...NEWSLETTER_DISCOUNT_ELIGIBLE_STATUSES] },
        },
        data: {
          discountRedeemedAt: redeemedAt,
          redeemedOrderId: orderReference || null,
        },
      });
      if (update.count !== 1) {
        const latest = await transaction.newsletterSubscription.findUnique({
          where: { id: subscription.id },
          select: { status: true, discountRedeemedAt: true },
        });
        return { lookupStatus: getNewsletterDiscountLookupStatus(latest) };
      }

      await transaction.newsletterDiscountRedemption.create({
        data: {
          subscriptionId: subscription.id,
          redeemedByUserId: authorization.user.id,
          redeemedAt,
          orderReference: orderReference || null,
          note: note || null,
        },
      });

      return {
        lookupStatus: "VALID" as const,
        redeemed: true,
        redeemedAt,
        code: subscription.discountCode,
        email: subscription.email,
        discountPercent: subscription.discountPercent,
      };
    });

    if (!("redeemed" in result)) {
      return noStoreJson({ redeemed: false, lookupStatus: result.lookupStatus }, 409);
    }
    return noStoreJson(result, 200);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return noStoreJson({ redeemed: false, lookupStatus: "ALREADY_REDEEMED" }, 409);
    }
    console.error("Unable to mark newsletter discount as redeemed.");
    return noStoreJson({ error: "Unable to mark this code as redeemed." }, 500);
  }
}
