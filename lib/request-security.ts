import { createHash } from "node:crypto";
import { isIP } from "node:net";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export class RequestBodyError extends Error {
  constructor(
    message: string,
    public readonly status: 400 | 413,
  ) {
    super(message);
    this.name = "RequestBodyError";
  }
}

type RateLimitResult =
  | { allowed: true; limit: number; remaining: number }
  | { allowed: false; limit: number; remaining: 0; retryAfterSeconds: number };

function getClientAddress(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const candidates = [
    request.headers.get("cf-connecting-ip")?.trim(),
    request.headers.get("x-real-ip")?.trim(),
    forwarded,
  ];
  return candidates.find((address) => address && isIP(address)) ?? "unknown";
}

export async function applyRateLimit(
  request: Request,
  scope: string,
  limit: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  if (!Number.isSafeInteger(limit) || limit < 1) {
    throw new Error("Rate limit must be a positive safe integer.");
  }
  if (!Number.isSafeInteger(windowSeconds) || windowSeconds < 1) {
    throw new Error("Rate limit window must be a positive safe integer.");
  }

  const key = createHash("sha256")
    .update(`${scope}:${getClientAddress(request)}`)
    .digest("hex");
  const rows = await prisma.$queryRaw<{ count: number; resetAt: Date }[]>(Prisma.sql`
    INSERT INTO "ApiRateLimitBucket" ("key", "count", "resetAt", "updatedAt")
    VALUES (${key}, 1, CURRENT_TIMESTAMP + (${windowSeconds} * INTERVAL '1 second'), CURRENT_TIMESTAMP)
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE
        WHEN "ApiRateLimitBucket"."resetAt" <= CURRENT_TIMESTAMP THEN 1
        ELSE "ApiRateLimitBucket"."count" + 1
      END,
      "resetAt" = CASE
        WHEN "ApiRateLimitBucket"."resetAt" <= CURRENT_TIMESTAMP
          THEN CURRENT_TIMESTAMP + (${windowSeconds} * INTERVAL '1 second')
        ELSE "ApiRateLimitBucket"."resetAt"
      END,
      "updatedAt" = CURRENT_TIMESTAMP
    RETURNING "count", "resetAt"
  `);
  const bucket = rows[0];
  if (!bucket) throw new Error("Rate limiter did not return a bucket.");
  if (bucket.count <= limit) {
    return { allowed: true, limit, remaining: limit - bucket.count };
  }
  return {
    allowed: false,
    limit,
    remaining: 0,
    retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt.getTime() - Date.now()) / 1000)),
  };
}

export function rateLimitResponse(
  result: Extract<RateLimitResult, { allowed: false }>,
): Response {
  return Response.json(
    { error: "Too many requests. Please wait before trying again." },
    {
      status: 429,
      headers: {
        "Cache-Control": "no-store",
        "Retry-After": String(result.retryAfterSeconds),
        "X-RateLimit-Limit": String(result.limit),
        "X-RateLimit-Remaining": String(result.remaining),
      },
    },
  );
}

export async function readJsonBody(request: Request, maximumBytes: number): Promise<unknown> {
  const contentLength = request.headers.get("content-length");
  if (contentLength && /^\d+$/u.test(contentLength) && Number(contentLength) > maximumBytes) {
    throw new RequestBodyError("Request body is too large.", 413);
  }
  const reader = request.body?.getReader();
  if (!reader) throw new RequestBodyError("Request body must be valid JSON.", 400);

  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > maximumBytes) {
        await reader.cancel();
        throw new RequestBodyError("Request body is too large.", 413);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const body = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(body)) as unknown;
  } catch {
    throw new RequestBodyError("Request body must be valid JSON.", 400);
  }
}
