ALTER TABLE "Category"
ADD COLUMN "displayOrder" INTEGER NOT NULL DEFAULT 0;

WITH ordered_categories AS (
    SELECT
        "id",
        (ROW_NUMBER() OVER (ORDER BY "name" ASC, "id" ASC) - 1)::INTEGER AS display_order
    FROM "Category"
)
UPDATE "Category" AS category
SET "displayOrder" = ordered_categories.display_order
FROM ordered_categories
WHERE category."id" = ordered_categories."id";
