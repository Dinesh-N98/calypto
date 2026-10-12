ALTER TABLE "PaymentAttempt"
ADD COLUMN "refundedAmountCents" INTEGER NOT NULL DEFAULT 0;
