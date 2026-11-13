ALTER TABLE "Product"
ADD COLUMN "displayOrder" INTEGER NOT NULL DEFAULT 0;

WITH ordered_products AS (
    SELECT
        "id",
        (ROW_NUMBER() OVER (ORDER BY "createdAt" DESC, "id" ASC) - 1)::INTEGER AS display_order
    FROM "Product"
)
UPDATE "Product" AS product
SET "displayOrder" = ordered_products.display_order
FROM ordered_products
WHERE product."id" = ordered_products."id";

CREATE INDEX "Product_isActive_displayOrder_idx" ON "Product"("isActive", "displayOrder");
