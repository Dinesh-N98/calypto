ALTER TABLE "Product"
ADD COLUMN "brand" TEXT,
ADD COLUMN "salePriceCents" INTEGER,
ADD COLUMN "originalPriceCents" INTEGER,
ADD COLUMN "saleEndsAt" TIMESTAMP(3);

CREATE TABLE "ProductVariant" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "discountPriceCents" INTEGER,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "size" TEXT,
    "color" TEXT,
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProductVariant_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ProductVariant_priceCents_check" CHECK ("priceCents" > 0),
    CONSTRAINT "ProductVariant_discountPriceCents_check" CHECK ("discountPriceCents" IS NULL OR ("discountPriceCents" > 0 AND "discountPriceCents" < "priceCents")),
    CONSTRAINT "ProductVariant_stock_check" CHECK ("stock" >= 0)
);

CREATE TABLE "ProductImage" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "altText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProductImage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Review_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Review_rating_check" CHECK ("rating" >= 1 AND "rating" <= 5)
);

CREATE TABLE "TieredDiscount" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "minQuantity" INTEGER NOT NULL,
    "discountPercentage" INTEGER NOT NULL,
    CONSTRAINT "TieredDiscount_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "TieredDiscount_minQuantity_check" CHECK ("minQuantity" >= 2),
    CONSTRAINT "TieredDiscount_percentage_check" CHECK ("discountPercentage" > 0 AND "discountPercentage" < 100)
);

ALTER TABLE "OrderItem" ADD COLUMN "variantId" TEXT, ADD COLUMN "sku" TEXT;

INSERT INTO "ProductVariant" ("id", "productId", "sku", "priceCents", "stock")
SELECT 'legacy_' || md5("id"), "id", 'LEGACY-' || upper(substr(md5("id"), 1, 12)), "priceCents", 0
FROM "Product";

CREATE UNIQUE INDEX "ProductVariant_sku_key" ON "ProductVariant"("sku");
CREATE INDEX "ProductVariant_productId_stock_idx" ON "ProductVariant"("productId", "stock");
CREATE INDEX "ProductVariant_productId_size_color_idx" ON "ProductVariant"("productId", "size", "color");
CREATE UNIQUE INDEX "ProductImage_productId_order_key" ON "ProductImage"("productId", "order");
CREATE INDEX "Review_productId_createdAt_idx" ON "Review"("productId", "createdAt");
CREATE UNIQUE INDEX "TieredDiscount_productId_minQuantity_key" ON "TieredDiscount"("productId", "minQuantity");
CREATE INDEX "Product_saleEndsAt_idx" ON "Product"("saleEndsAt");

ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_productId_fkey"
FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductImage" ADD CONSTRAINT "ProductImage_productId_fkey"
FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Review" ADD CONSTRAINT "Review_productId_fkey"
FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TieredDiscount" ADD CONSTRAINT "TieredDiscount_productId_fkey"
FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
