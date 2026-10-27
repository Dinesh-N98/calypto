-- CreateEnum
CREATE TYPE "NewsletterDiscountLookupStatus" AS ENUM (
    'VALID',
    'ALREADY_REDEEMED',
    'NOT_FOUND',
    'INELIGIBLE'
);

-- AlterTable
ALTER TABLE "Lead"
ADD COLUMN "discountCode" TEXT,
ADD COLUMN "discountCodeStatus" "NewsletterDiscountLookupStatus",
ADD COLUMN "discountSubscriberEmail" TEXT,
ADD COLUMN "discountPercent" INTEGER;

-- CreateTable
CREATE TABLE "NewsletterDiscountRedemption" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "redeemedByUserId" TEXT NOT NULL,
    "redeemedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "orderReference" TEXT,
    "note" TEXT,

    CONSTRAINT "NewsletterDiscountRedemption_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NewsletterDiscountRedemption_subscriptionId_key"
ON "NewsletterDiscountRedemption"("subscriptionId");

-- CreateIndex
CREATE INDEX "NewsletterDiscountRedemption_redeemedByUserId_redeemedAt_idx"
ON "NewsletterDiscountRedemption"("redeemedByUserId", "redeemedAt");

-- AddForeignKey
ALTER TABLE "NewsletterDiscountRedemption"
ADD CONSTRAINT "NewsletterDiscountRedemption_subscriptionId_fkey"
FOREIGN KEY ("subscriptionId") REFERENCES "NewsletterSubscription"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NewsletterDiscountRedemption"
ADD CONSTRAINT "NewsletterDiscountRedemption_redeemedByUserId_fkey"
FOREIGN KEY ("redeemedByUserId") REFERENCES "User"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
