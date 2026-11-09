import type { Product as PrismaProduct, Prisma } from "@prisma/client";

export type Product = PrismaProduct;

export interface ProductPackagingSpecifications {
  pieceLengthInches: number;
  piecesPerPack: number;
  packWeightGrams: number;
}

export type CreateProductInput = Pick<
  Prisma.ProductUncheckedCreateInput,
  | "name"
  | "slug"
  | "description"
  | "categoryId"
  | "imageUrl"
  | "priceCents"
  | "brand"
  | "salePriceCents"
  | "originalPriceCents"
  | "saleEndsAt"
  | "tieredDiscountsEnabled"
  | "isActive"
  | "trackInventory"
  | "tags"
> &
  Partial<ProductPackagingSpecifications>;
