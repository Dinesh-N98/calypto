ALTER TABLE "Category"
ADD COLUMN "tieredDiscountsEnabled" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "Product"
ADD COLUMN "tieredDiscountsEnabled" BOOLEAN;
