ALTER TABLE "Promotion"
    ADD COLUMN IF NOT EXISTS "discountType" TEXT NOT NULL DEFAULT 'percentage';

ALTER TABLE "Promotion"
    ADD COLUMN IF NOT EXISTS "discountAmountCents" INTEGER;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'Promotion_discountType_check'
          AND conrelid = '"Promotion"'::regclass
    ) THEN
        ALTER TABLE "Promotion"
            ADD CONSTRAINT "Promotion_discountType_check"
            CHECK ("discountType" IN ('percentage', 'fixed'));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'Promotion_discountAmountCents_check'
          AND conrelid = '"Promotion"'::regclass
    ) THEN
        ALTER TABLE "Promotion"
            ADD CONSTRAINT "Promotion_discountAmountCents_check"
            CHECK ("discountAmountCents" IS NULL OR "discountAmountCents" BETWEEN 1 AND 1000000);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'Promotion_discountType_value_check'
          AND conrelid = '"Promotion"'::regclass
    ) THEN
        ALTER TABLE "Promotion"
            ADD CONSTRAINT "Promotion_discountType_value_check"
            CHECK (
                ("discountType" = 'percentage' AND "discountAmountCents" IS NULL)
                OR ("discountType" = 'fixed' AND "discountPercent" IS NULL)
            );
    END IF;
END
$$;
