import { notFound } from "next/navigation";
import { ProductEditForm, type ProductRecord } from "@/components/admin/AdminProductsTable";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminEditProductPage({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  const { productId } = await params;
  const [categories, product] = await Promise.all([
    prisma.category.findMany({
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true, tieredDiscountsEnabled: true },
    }),
    prisma.product.findUnique({
      where: { id: productId },
      include: {
        category: { select: { name: true, tieredDiscountsEnabled: true } },
        images: { orderBy: { order: "asc" }, select: { url: true } },
        variants: {
          orderBy: { createdAt: "asc" },
          select: {
            sku: true,
            size: true,
            color: true,
            priceCents: true,
            discountPriceCents: true,
            stock: true,
            imageUrl: true,
            weightKg: true,
            lengthCm: true,
            widthCm: true,
            heightCm: true,
          },
        },
        tieredDiscounts: {
          orderBy: { minQuantity: "asc" },
          select: { minQuantity: true, discountPercentage: true },
        },
      },
    }),
  ]);

  if (!product) notFound();

  const productRecord: ProductRecord = {
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description,
    brand: product.brand,
    priceCents: product.priceCents,
    salePriceCents: product.salePriceCents,
    originalPriceCents: product.originalPriceCents,
    saleEndsAt: product.saleEndsAt,
    imageUrl: product.imageUrl,
    images: product.images,
    variants: product.variants,
    tieredDiscounts: product.tieredDiscounts,
    tags: product.tags,
    isActive: product.isActive,
    trackInventory: product.trackInventory,
    pieceLengthInches: product.pieceLengthInches,
    piecesPerPack: product.piecesPerPack,
    packWeightGrams: product.packWeightGrams,
    tieredDiscountsEnabled: product.tieredDiscountsEnabled,
    categoryTieredDiscountsEnabled: product.category.tieredDiscountsEnabled,
    categoryId: product.categoryId,
    categoryName: product.category.name,
  };

  return <ProductEditForm categories={categories} product={productRecord} />;
}
