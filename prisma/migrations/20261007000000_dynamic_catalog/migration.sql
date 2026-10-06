CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

INSERT INTO "Category" ("id", "name", "slug")
SELECT
    'category_' || md5(category_slug),
    MIN(category_name),
    category_slug
FROM (
    SELECT
        TRIM("category") AS category_name,
        COALESCE(
            NULLIF(
                CASE LOWER(TRIM("category"))
                    WHEN 'worm bait' THEN 'worm'
                    WHEN 'curly-tail grub' THEN 'curly-tail-grub'
                    ELSE BTRIM(REGEXP_REPLACE(LOWER(TRIM("category")), '[^a-z0-9]+', '-', 'g'), '-')
                END,
                ''
            ),
            'uncategorized'
        ) AS category_slug
    FROM "Product"
    GROUP BY TRIM("category")
) AS normalized_categories
GROUP BY category_slug;

ALTER TABLE "Product" ADD COLUMN "categoryId" TEXT;

UPDATE "Product" AS product
SET "categoryId" = category.id
FROM "Category" AS category
WHERE category.slug = COALESCE(
    NULLIF(
        CASE LOWER(TRIM(product."category"))
            WHEN 'worm bait' THEN 'worm'
            WHEN 'curly-tail grub' THEN 'curly-tail-grub'
            ELSE BTRIM(REGEXP_REPLACE(LOWER(TRIM(product."category")), '[^a-z0-9]+', '-', 'g'), '-')
        END,
        ''
    ),
    'uncategorized'
);

ALTER TABLE "Product" ALTER COLUMN "categoryId" SET NOT NULL;
ALTER TABLE "Product" DROP COLUMN "category";

CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");
CREATE INDEX "Product_categoryId_idx" ON "Product"("categoryId");

ALTER TABLE "Product"
ADD CONSTRAINT "Product_categoryId_fkey"
FOREIGN KEY ("categoryId") REFERENCES "Category"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
