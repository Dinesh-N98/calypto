"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminPage } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

function redirectWithNotice(path: string, notice: string): never {
  redirect(`${path}?${new URLSearchParams({ notice })}`);
}

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

export async function createCategory(formData: FormData): Promise<void> {
  await requireAdminPage("/admin/categories");
  const name = getText(formData, "name");
  const slug = slugify(name);
  if (!name || name.length > 100 || !isValidSlug(slug)) {
    redirectWithNotice(
      "/admin/categories",
      "Enter a category name that produces a valid URL slug.",
    );
  }

  try {
    await prisma.category.create({ data: { name, slug } });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      redirectWithNotice("/admin/categories", "A category with this name or slug already exists.");
    }
    throw error;
  }

  revalidateCatalog();
  redirectWithNotice("/admin/categories", "Category created.");
}

export async function deleteCategory(formData: FormData): Promise<void> {
  await requireAdminPage("/admin/categories");
  const id = getText(formData, "id");
  if (!id) redirectWithNotice("/admin/categories", "Choose a valid category.");

  try {
    await prisma.category.delete({ where: { id } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      redirectWithNotice(
        "/admin/categories",
        "This category still has products. Reassign or delete them before deleting the category.",
      );
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      redirectWithNotice("/admin/categories", "That category no longer exists.");
    }
    throw error;
  }

  revalidateCatalog();
  redirectWithNotice("/admin/categories", "Category deleted.");
}

function readProduct(formData: FormData) {
  const name = getText(formData, "name");
  const slug = getText(formData, "slug");
  const description = getText(formData, "description");
  const priceCents = parsePriceCents(getText(formData, "price"));
  const imageUrl = getText(formData, "imageUrl");
  const categoryId = getText(formData, "categoryId");

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

  return {
    data: { name, slug, description, priceCents, imageUrl, categoryId },
  } as const;
}

export async function createProduct(
  formData: FormData,
): Promise<{ ok: true; message: string } | { ok: false; error: string }> {
  await requireAdminPage("/admin/products");
  const product = readProduct(formData);
  if (product.error) return { ok: false, error: product.error };

  try {
    await prisma.product.create({ data: product.data });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return { ok: false, error: "A product with this slug already exists." };
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
    await prisma.product.update({ where: { id }, data: product.data });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return { ok: false, error: "A product with this slug already exists." };
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
