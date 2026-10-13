ALTER TYPE "PaymentProvider" ADD VALUE IF NOT EXISTS 'PAYPAL';

ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "shippingName" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "shippingLine1" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "shippingLine2" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "shippingCity" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "shippingState" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "shippingPostalCode" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "shippingCountry" TEXT;

CREATE TABLE IF NOT EXISTS "PaymentAttempt" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "provider" "PaymentProvider" NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "captureRequestId" TEXT NOT NULL,
    "providerOrderId" TEXT,
    "providerCaptureId" TEXT,
    "providerTransactionId" TEXT,
    "metadata" JSONB,
    "expiresAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentAttempt_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PaymentWebhookEvent" (
    "id" TEXT NOT NULL,
    "provider" "PaymentProvider" NOT NULL,
    "providerEventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'received',
    "payloadHash" TEXT,

    CONSTRAINT "PaymentWebhookEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PaymentAttempt_idempotencyKey_key" ON "PaymentAttempt"("idempotencyKey");
CREATE UNIQUE INDEX IF NOT EXISTS "PaymentAttempt_captureRequestId_key" ON "PaymentAttempt"("captureRequestId");
CREATE UNIQUE INDEX IF NOT EXISTS "PaymentAttempt_providerOrderId_key" ON "PaymentAttempt"("providerOrderId");
CREATE UNIQUE INDEX IF NOT EXISTS "PaymentAttempt_providerCaptureId_key" ON "PaymentAttempt"("providerCaptureId");
CREATE UNIQUE INDEX IF NOT EXISTS "PaymentAttempt_providerTransactionId_key" ON "PaymentAttempt"("providerTransactionId");
CREATE INDEX IF NOT EXISTS "PaymentAttempt_orderId_status_idx" ON "PaymentAttempt"("orderId", "status");
CREATE INDEX IF NOT EXISTS "PaymentAttempt_provider_status_expiresAt_idx" ON "PaymentAttempt"("provider", "status", "expiresAt");
CREATE UNIQUE INDEX IF NOT EXISTS "PaymentWebhookEvent_provider_providerEventId_key" ON "PaymentWebhookEvent"("provider", "providerEventId");
CREATE INDEX IF NOT EXISTS "PaymentWebhookEvent_provider_eventType_receivedAt_idx" ON "PaymentWebhookEvent"("provider", "eventType", "receivedAt");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'PaymentAttempt_orderId_fkey'
          AND conrelid = '"PaymentAttempt"'::regclass
    ) THEN
        ALTER TABLE "PaymentAttempt"
        ADD CONSTRAINT "PaymentAttempt_orderId_fkey"
        FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END
$$;
