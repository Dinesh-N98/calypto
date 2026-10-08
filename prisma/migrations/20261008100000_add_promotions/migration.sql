CREATE TABLE "Promotion" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "discountPercent" INTEGER,
    "discountCode" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Promotion_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Promotion_discountPercent_check"
        CHECK ("discountPercent" IS NULL OR ("discountPercent" >= 1 AND "discountPercent" <= 100)),
    CONSTRAINT "Promotion_date_range_check"
        CHECK ("startDate" IS NULL OR "endDate" IS NULL OR "startDate" <= "endDate")
);

CREATE INDEX "Promotion_isActive_startDate_endDate_idx"
    ON "Promotion"("isActive", "startDate", "endDate");
