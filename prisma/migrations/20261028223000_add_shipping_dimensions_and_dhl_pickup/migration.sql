ALTER TABLE "ProductVariant"
  ADD COLUMN "weightKg" DOUBLE PRECISION,
  ADD COLUMN "lengthCm" DOUBLE PRECISION,
  ADD COLUMN "widthCm" DOUBLE PRECISION,
  ADD COLUMN "heightCm" DOUBLE PRECISION;

ALTER TABLE "Order"
  ADD COLUMN "shippingCents" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "shippingServiceCode" TEXT,
  ADD COLUMN "dhlPickupConfirmationNumber" TEXT,
  ADD COLUMN "dhlPickupRawResponse" JSONB;
