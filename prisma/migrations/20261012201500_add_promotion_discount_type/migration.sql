ALTER TABLE "Promotion"
    ADD COLUMN "discountType" TEXT NOT NULL DEFAULT 'percentage',
    ADD COLUMN "discountAmountCents" INTEGER;

ALTER TABLE "Promotion"
    ADD CONSTRAINT "Promotion_discountType_check"
        CHECK ("discountType" IN ('percentage', 'fixed')),
    ADD CONSTRAINT "Promotion_discountAmountCents_check"
        CHECK ("discountAmountCents" IS NULL OR "discountAmountCents" BETWEEN 1 AND 1000000),
    ADD CONSTRAINT "Promotion_discountType_value_check"
        CHECK (
            ("discountType" = 'percentage' AND "discountAmountCents" IS NULL)
            OR ("discountType" = 'fixed' AND "discountPercent" IS NULL)
        );
