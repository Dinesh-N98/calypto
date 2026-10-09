"use server";

import { Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireAdminPage } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

function getText(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function parsePriceCents(value: string): number | null {
  const match = /^(\d{1,8})(?:\.(\d{1,2}))?$/.exec(value);
  if (!match) return null;
  const cents = Number(match[1]) * 100 + Number((match[2] ?? "").padEnd(2, "0"));
  return Number.isSafeInteger(cents) && cents > 0 && cents <= 2_147_483_647 ? cents : null;
}

function parseOptionalPriceCents(value: string): number | null | undefined {
  if (!value) return null;
  return parsePriceCents(value) ?? undefined;
}

function parseVariants(
  value: string,
  baseImageUrl: string,
  basePriceCents: number,
  defaultStock: number,
) {
  try {
    const raw: unknown = JSON.parse(value || "[]");
    if (!Array.isArray(raw) || raw.length > 100) return null;
    if (raw.length === 0) {
      return [{
        sku: `AUTO-${randomUUID().replaceAll("-", "").slice(0, 20).toUpperCase()}`,
        size: null,
        color: null,
        priceCents: basePriceCents,
        discountPriceCents: null,
        stock: defaultStock,
        imageUrl: baseImageUrl,
      }];
    }
    const variants = raw.map((entry) => {
      if (typeof entry !== "object" || entry === null || Array.isArray(entry)) return null;
      const item = entry as Record<string, unknown>;
      if (
        (item.sku !== undefined && typeof item.sku !== "string") ||
        (item.size !== undefined && typeof item.size !== "string") ||
        (item.color !== undefined && typeof item.color !== "string") ||
        (item.discountPrice !== undefined && typeof item.discountPrice !== "string") ||
        (item.imageUrl !== undefined && typeof item.imageUrl !== "string")
      ) {
        return null;
      }
      const skuInput = typeof item.sku === "string" ? item.sku.trim() : "";
      const sku = skuInput ||
        `AUTO-${randomUUID().replaceAll("-", "").slice(0, 20).toUpperCase()}`;
      const size = typeof item.size === "string" ? item.size.trim() : "";
      const color = typeof item.color === "string" ? item.color.trim() : "";
      const priceCents = typeof item.price === "string" ? parsePriceCents(item.price) : null;
      const discountPriceInput =
        typeof item.discountPrice === "string" ? item.discountPrice.trim() : "";
      const discountPriceCents = discountPriceInput
        ? parsePriceCents(discountPriceInput)
        : null;
      const stock = typeof item.stock === "number" ? item.stock : Number(item.stock);
      const imageUrl = typeof item.imageUrl === "string" ? item.imageUrl.trim() : "";
      if (
        !sku ||
        sku.length > 80 ||
        !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(sku) ||
        !priceCents ||
        (discountPriceInput &&
          (discountPriceCents === null || discountPriceCents >= priceCents)) ||
        !Number.isSafeInteger(stock) ||
        stock < 0 ||
        size.length > 100 ||
        color.length > 100 ||
        (imageUrl && !isValidImagePath(imageUrl))
      ) {
        return null;
      }
      return {
        sku,
        size: size || null,
        color: color || null,
        priceCents,
        discountPriceCents,
        stock,
        imageUrl: imageUrl || null,
      };
    });
    if (variants.some((variant) => variant === null)) return null;
    const parsedVariants = variants.filter((variant) => variant !== null);
    const uniqueSkus =
      new Set(parsedVariants.map((variant) => variant.sku.toLowerCase())).size ===
      parsedVariants.length;
    const uniqueOptions =
      new Set(parsedVariants.map((variant) => `${variant.color ?? ""}\u0000${variant.size ?? ""}`))
        .size === parsedVariants.length;
    const hasOnlyOneHiddenDefault =
      parsedVariants.some((variant) => variant.color === null && variant.size === null)
        ? parsedVariants.length === 1
        : true;
    return uniqueSkus && uniqueOptions && hasOnlyOneHiddenDefault ? parsedVariants : null;
  } catch {
    return null;
  }
}

function parseImageUrls(value: string, fallback: string) {
  try {
    const raw: unknown = value ? JSON.parse(value) : [];
    if (!Array.isArray(raw) || raw.length > 20) return null;
    const urls = raw.filter((item): item is string => typeof item === "string").map((url) => url.trim());
    if (urls.length !== raw.length || urls.some((url) => !isValidImagePath(url))) return null;
    const result = [...new Set([fallback, ...urls])];
    return result.length <= 20 ? result : null;
  } catch {
    return null;
  }
}

function parseTieredDiscounts(value: string) {
  try {
    const raw: unknown = value ? JSON.parse(value) : [];
    if (!Array.isArray(raw) || raw.length > 20) return null;
    const tiers = raw.map((entry) => {
      if (typeof entry !== "object" || entry === null || Array.isArray(entry)) return null;
      const item = entry as Record<string, unknown>;
      const minQuantity = Number(item.minQuantity);
      const discountPercentage = Number(item.discountPercentage);
      if (
        !Number.isSafeInteger(minQuantity) ||
        minQuantity < 2 ||
        !Number.isInteger(discountPercentage) ||
        discountPercentage < 1 ||
        discountPercentage > 99
      ) {
        return null;
      }
      return { minQuantity, discountPercentage };
    });
    if (tiers.some((tier) => tier === null)) return null;
    const parsedTiers = tiers.filter((tier) => tier !== null);
    if (new Set(parsedTiers.map((tier) => tier.minQuantity)).size !== parsedTiers.length) return null;
    parsedTiers.sort((a, b) => a.minQuantity - b.minQuantity);
    return parsedTiers.every(
      (tier, index) =>
        index === 0 || tier.discountPercentage > parsedTiers[index - 1].discountPercentage,
    )
      ? parsedTiers
      : null;
  } catch {
    return null;
  }
}

function isValidSlug(value: string): boolean {
  return value.length <= 120 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}

function isValidImagePath(value: string): boolean {
  return value.length <= 500 && value.startsWith("/") && !value.startsWith("//");
}

function revalidateCatalog(): void {
  revalidatePath("/admin");
  revalidatePath("/admin/products");
  revalidatePath("/admin/categories");
  revalidatePath("/shop");
  revalidatePath("/", "layout");
}

function isUniqueConstraintError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

function readCategory(formData: FormData) {
  const name = getText(formData, "name");
  const slug = slugify(getText(formData, "slug") || name);
  const tieredDiscountsEnabled = formData.get("tieredDiscountsEnabled") === "on";

  if (!name || name.length > 100) {
    return { error: "Category name is required (max 100 characters)." } as const;
  }
  if (!isValidSlug(slug)) {
    return { error: "Use a URL-safe slug with lowercase letters, numbers, and hyphens." } as const;
  }

  return { data: { name, slug, tieredDiscountsEnabled } } as const;
}

export async function createCategory(
  formData: FormData,
): Promise<{ ok: true; message: string } | { ok: false; error: string }> {
  await requireAdminPage("/admin/categories");
  const category = readCategory(formData);
  if (category.error) return { ok: false, error: category.error };

  try {
    await prisma.category.create({ data: category.data });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return { ok: false, error: "A category with this name or slug already exists." };
    }
    throw error;
  }

  revalidateCatalog();
  return { ok: true, message: "Category created." };
}

export async function updateCategory(
  formData: FormData,
): Promise<{ ok: true; message: string } | { ok: false; error: string }> {
  await requireAdminPage("/admin/categories");
  const id = getText(formData, "id");
  if (!id) return { ok: false, error: "Choose a valid category." };

  const category = readCategory(formData);
  if (category.error) return { ok: false, error: category.error };

  try {
    await prisma.category.update({ where: { id }, data: category.data });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return { ok: false, error: "A category with this name or slug already exists." };
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return { ok: false, error: "That category no longer exists." };
    }
    throw error;
  }

  revalidateCatalog();
  return { ok: true, message: "Category updated." };
}

export async function deleteCategory(
  formData: FormData,
): Promise<{ ok: true; message: string } | { ok: false; error: string }> {
  await requireAdminPage("/admin/categories");
  const id = getText(formData, "id");
  if (!id) return { ok: false, error: "Choose a valid category." };

  try {
    await prisma.category.delete({ where: { id } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      return {
        ok: false,
        error: "This category still has products. Reassign or delete them before deleting the category.",
      };
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return { ok: false, error: "That category no longer exists." };
    }
    throw error;
  }

  revalidateCatalog();
  return { ok: true, message: "Category deleted." };
}

function readProduct(formData: FormData) {
  const name = getText(formData, "name");
  const slug = getText(formData, "slug");
  const description = getText(formData, "description");
  const priceCents = parsePriceCents(getText(formData, "price"));
  const defaultStockInput = getText(formData, "defaultStock");
  const defaultStock = defaultStockInput ? Number(defaultStockInput) : 0;
  const imageUrl = getText(formData, "imageUrl");
  const categoryId = getText(formData, "categoryId");
  const brand = getText(formData, "brand");
  const salePriceInput = getText(formData, "salePrice");
  const salePriceInputCents = parseOptionalPriceCents(salePriceInput);
  const discountAmountInput = getText(formData, "discountAmount");
  const discountAmountCents = parseOptionalPriceCents(discountAmountInput);
  const originalPriceInput = getText(formData, "originalPrice");
  const originalPriceCents = parseOptionalPriceCents(originalPriceInput);
  const saleEndsAtInput = getText(formData, "saleEndsAt");
  const saleEndsAt = saleEndsAtInput ? new Date(saleEndsAtInput) : null;
  const variants = parseVariants(
    getText(formData, "variants"),
    imageUrl,
    priceCents ?? 0,
    defaultStock,
  );
  const images = parseImageUrls(getText(formData, "imageUrls"), imageUrl);
  const tieredDiscounts = parseTieredDiscounts(getText(formData, "tieredDiscounts"));

  if (!name || name.length > 160)
    return { error: "Product name is required (max 160 characters)." } as const;
  if (!isValidSlug(slug))
    return { error: "Use a URL-safe slug with lowercase letters, numbers, and hyphens." } as const;
  if (!description || description.length > 5000)
    return { error: "Description is required (max 5,000 characters)." } as const;
  if (priceCents === null)
    return { error: "Enter a positive price with up to two decimal places." } as const;
  if (!isValidImagePath(imageUrl))
    return {
      error: "Image must be a path under the site root, such as /products/worm/worm-01.jpg.",
    } as const;
  if (!categoryId) return { error: "Choose a category." } as const;
  if (brand.length > 100) return { error: "Brand must be 100 characters or fewer." } as const;
  if (
    salePriceInputCents === undefined ||
    discountAmountCents === undefined ||
    originalPriceCents === undefined
  ) {
    return { error: "Enter valid promotional and original prices." } as const;
  }
  if (salePriceInput && discountAmountInput) {
    return { error: "Enter either a sale price or a discount amount, not both." } as const;
  }
  if (discountAmountInput && originalPriceCents === null) {
    return { error: "Enter an original price to calculate the discount amount." } as const;
  }
  const salePriceCents =
    discountAmountCents !== null && originalPriceCents !== null
      ? originalPriceCents - discountAmountCents
      : salePriceInputCents;
  if (
    discountAmountCents !== null &&
    (discountAmountCents >= (originalPriceCents ?? 0) || (originalPriceCents ?? 0) - discountAmountCents <= 0)
  ) {
    return { error: "Discount amount must be less than the original price." } as const;
  }
  const referencePriceCents = salePriceCents ?? priceCents;
  const hasVariantPromotions = variants?.some((variant) => variant.discountPriceCents !== null);
  if (
    (salePriceCents !== null && !saleEndsAt) ||
    (saleEndsAt && !salePriceCents && !hasVariantPromotions) ||
    (saleEndsAt && Number.isNaN(saleEndsAt.getTime())) ||
    (salePriceCents !== null && salePriceCents >= priceCents) ||
    (originalPriceCents !== null && originalPriceCents <= referencePriceCents)
  ) {
    return { error: "Promotional pricing needs a lower sale price and a valid end date." } as const;
  }
  if (!variants) {
    return {
      error: "Variants must have unique SKU and color/size combinations, valid prices, and non-negative stock.",
    } as const;
  }
  if (!Number.isSafeInteger(defaultStock) || defaultStock < 0 || defaultStock > 2_147_483_647) {
    return { error: "Default stock must be a non-negative whole number." } as const;
  }
  if (!images) {
    return { error: "Product gallery contains an invalid or excessive image list." } as const;
  }
  if (!tieredDiscounts) {
    return {
      error: "Tier discounts must have unique quantities (2+) and percentages from 1 to 99.",
    } as const;
  }
  const tieredDiscountsEnabledInput = getText(formData, "tieredDiscountsEnabled");
  const tieredDiscountsEnabled =
    tieredDiscountsEnabledInput === "" ? null
      : tieredDiscountsEnabledInput === "true" ? true
        : tieredDiscountsEnabledInput === "false" ? false
          : undefined;
  if (tieredDiscountsEnabled === undefined) {
    return { error: "Choose whether quantity discounts are inherited, enabled, or disabled." } as const;
  }
  if (tieredDiscounts.length > 0 && tieredDiscountsEnabled === false) {
    return { error: "Remove quantity discount rules or enable quantity discounts for this product." } as const;
  }

  return {
    data: {
      name,
      slug,
      description,
      brand: brand || null,
      priceCents,
      salePriceCents,
      originalPriceCents,
      saleEndsAt,
      tieredDiscountsEnabled,
      imageUrl,
      categoryId,
      variants,
      images: images.map((url, order) => ({ url, order, altText: name })),
      tieredDiscounts,
    },
  } as const;
}

export async function createProduct(
  formData: FormData,
): Promise<{ ok: true; message: string } | { ok: false; error: string }> {
  await requireAdminPage("/admin/products");
  const product = readProduct(formData);
  if (product.error) return { ok: false, error: product.error };

  try {
    const { variants, images, tieredDiscounts, ...data } = product.data;
    await prisma.product.create({
      data: {
        ...data,
        variants: { create: variants },
        images: { create: images },
        tieredDiscounts: { create: tieredDiscounts },
      },
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return { ok: false, error: "A product slug or variant SKU already exists." };
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      return { ok: false, error: "Choose an existing category." };
    }
    throw error;
  }

  revalidateCatalog();
  return { ok: true, message: "Product created." };
}

export async function updateProduct(
  formData: FormData,
): Promise<{ ok: true; message: string } | { ok: false; error: string }> {
  await requireAdminPage("/admin/products");
  const id = getText(formData, "id");
  if (!id) return { ok: false, error: "Choose a valid product." };

  const product = readProduct(formData);
  if (product.error) return { ok: false, error: product.error };

  try {
    const { variants, images, tieredDiscounts, ...data } = product.data;
    await prisma.$transaction(async (transaction) => {
      const currentVariants = await transaction.productVariant.findMany({
        where: { productId: id },
        select: { id: true, sku: true },
      });
      const currentBySku = new Map(
        currentVariants.map((variant) => [variant.sku.toLowerCase(), variant.id]),
      );
      const requestedSkus = variants.map((variant) => variant.sku);
      await transaction.productVariant.deleteMany({
        where: { productId: id, sku: { notIn: requestedSkus } },
      });
      await transaction.product.update({
        where: { id },
        data: {
          ...data,
          images: { deleteMany: {}, create: images },
          tieredDiscounts: { deleteMany: {}, create: tieredDiscounts },
        },
      });
      for (const variant of variants) {
        const existingId = currentBySku.get(variant.sku.toLowerCase());
        if (existingId) {
          await transaction.productVariant.update({
            where: { id: existingId },
            data: variant,
          });
        } else {
          await transaction.productVariant.create({ data: { ...variant, productId: id } });
        }
      }
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return { ok: false, error: "A product slug or variant SKU already exists." };
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return { ok: false, error: "That product no longer exists." };
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      return { ok: false, error: "Choose an existing category." };
    }
    throw error;
  }

  revalidateCatalog();
  return { ok: true, message: "Product updated." };
}

export async function deleteProduct(
  formData: FormData,
): Promise<{ ok: true; message: string } | { ok: false; error: string }> {
  await requireAdminPage("/admin/products");
  const id = getText(formData, "id");
  if (!id) return { ok: false, error: "Choose a valid product." };

  try {
    await prisma.product.delete({ where: { id } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return { ok: false, error: "That product no longer exists." };
    }
    throw error;
  }

  revalidateCatalog();
  return { ok: true, message: "Product deleted." };
}
