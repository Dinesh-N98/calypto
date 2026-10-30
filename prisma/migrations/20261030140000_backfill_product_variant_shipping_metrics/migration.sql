-- Backfill package metrics for existing inventory. Values are intentionally conservative
-- package estimates and remain nullable for products that need manual measurement.
UPDATE "ProductVariant" AS variant
SET
  "weightKg" = COALESCE(variant."weightKg", CASE
    WHEN LOWER(category.slug) IN ('worm', 'swimbait', 'curly-tail-grub', 'jig') THEN 0.15
    WHEN LOWER(product.name) LIKE '%t-shirt%'
      OR LOWER(product.name) LIKE '%shirt%'
      OR LOWER(category.name) LIKE '%apparel%' THEN 0.35
    ELSE NULL
  END),
  "lengthCm" = COALESCE(variant."lengthCm", CASE
    WHEN LOWER(category.slug) IN ('worm', 'swimbait', 'curly-tail-grub', 'jig') THEN
      COALESCE(
        NULLIF((regexp_match(COALESCE(variant."size", ''), '([0-9]+(?:\.[0-9]+)?)'))[1], '')::double precision * 2.54,
        10.16
      )
    WHEN LOWER(product.name) LIKE '%t-shirt%'
      OR LOWER(product.name) LIKE '%shirt%'
      OR LOWER(category.name) LIKE '%apparel%' THEN 30
    ELSE NULL
  END),
  "widthCm" = COALESCE(variant."widthCm", CASE
    WHEN LOWER(category.slug) IN ('worm', 'swimbait', 'curly-tail-grub', 'jig') THEN 4
    WHEN LOWER(product.name) LIKE '%t-shirt%'
      OR LOWER(product.name) LIKE '%shirt%'
      OR LOWER(category.name) LIKE '%apparel%' THEN 25
    ELSE NULL
  END),
  "heightCm" = COALESCE(variant."heightCm", CASE
    WHEN LOWER(category.slug) IN ('worm', 'swimbait', 'curly-tail-grub', 'jig') THEN 2
    WHEN LOWER(product.name) LIKE '%t-shirt%'
      OR LOWER(product.name) LIKE '%shirt%'
      OR LOWER(category.name) LIKE '%apparel%' THEN 4
    ELSE NULL
  END)
FROM "Product" AS product
JOIN "Category" AS category ON category.id = product."categoryId"
WHERE variant."productId" = product.id
  AND (
    variant."weightKg" IS NULL
    OR variant."lengthCm" IS NULL
    OR variant."widthCm" IS NULL
    OR variant."heightCm" IS NULL
  );
