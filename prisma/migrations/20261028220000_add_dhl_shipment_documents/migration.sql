ALTER TABLE "Order"
  ADD COLUMN "dhlTrackingNumber" TEXT,
  ADD COLUMN "dhlShipmentIdentificationNumber" TEXT,
  ADD COLUMN "shippingLabelUrl" TEXT,
  ADD COLUMN "commercialInvoiceUrl" TEXT,
  ADD COLUMN "shippingLabelData" TEXT,
  ADD COLUMN "commercialInvoiceData" TEXT,
  ADD COLUMN "dhlRawResponse" JSONB;

CREATE UNIQUE INDEX "Order_dhlTrackingNumber_key"
  ON "Order"("dhlTrackingNumber");
