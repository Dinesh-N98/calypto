"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { requireAdminPage } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

type ActionResult = { ok: true; message: string } | { ok: false; error: string };

function getText(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function parseDate(value: string, endOfDay = false): Date | null | undefined {
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;

  const date = new Date(`${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value
    ? undefined
    : date;
}

function isValidImageUrl(value: string): boolean {
  if (!value || value.length > 2048 || /[\u0000-\u001f\u007f]/.test(value)) return false;
  if (value.startsWith("/") && !value.startsWith("//")) return true;

  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function readPromotion(formData: FormData) {
  const title = getText(formData, "title");
  const description = getText(formData, "description");
  const imageUrl = getText(formData, "imageUrl");
  const discountText = getText(formData, "discountPercent");
  const discountCode = getText(formData, "discountCode");
  const startDate = parseDate(getText(formData, "startDate"));
  const endDate = parseDate(getText(formData, "endDate"), true);

  if (!title || title.length > 120)
    return { error: "Promotion title is required (max 120 characters)." } as const;
  if (!description || description.length > 2000)
    return { error: "Description is required (max 2,000 characters)." } as const;
  if (!isValidImageUrl(imageUrl))
    return { error: "Use a site-relative image path or an HTTPS image URL." } as const;
  if (
    discountText &&
    (!/^\d{1,3}$/.test(discountText) || Number(discountText) < 1 || Number(discountText) > 100)
  )
    return { error: "Discount rate must be a whole number from 1 to 100." } as const;
  if (discountCode.length > 50)
    return { error: "Discount code must be 50 characters or fewer." } as const;
  if (startDate === undefined || endDate === undefined)
    return { error: "Enter valid start and end dates." } as const;
  if (startDate && endDate && startDate > endDate)
    return { error: "The end date must be on or after the start date." } as const;

  return {
    data: {
      title,
      description,
      imageUrl,
      discountPercent: discountText ? Number(discountText) : null,
      discountCode: discountCode || null,
      isActive: formData.get("isActive") === "on",
      startDate,
      endDate,
    },
  } as const;
}

function revalidatePromotions(): void {
  revalidatePath("/admin");
  revalidatePath("/admin/promotions");
  revalidatePath("/", "page");
}

function isMissingRecord(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025";
}

export async function createPromotion(formData: FormData): Promise<ActionResult> {
  await requireAdminPage("/admin/promotions");
  const promotion = readPromotion(formData);
  if ("error" in promotion && promotion.error !== undefined)
    return { ok: false, error: promotion.error };

  await prisma.promotion.create({ data: promotion.data });
  revalidatePromotions();
  return { ok: true, message: "Promotion created." };
}

export async function updatePromotion(formData: FormData): Promise<ActionResult> {
  await requireAdminPage("/admin/promotions");
  const id = getText(formData, "id");
  if (!id) return { ok: false, error: "Choose a valid promotion." };

  const promotion = readPromotion(formData);
  if ("error" in promotion && promotion.error !== undefined)
    return { ok: false, error: promotion.error };

  try {
    await prisma.promotion.update({ where: { id }, data: promotion.data });
  } catch (error) {
    if (isMissingRecord(error)) return { ok: false, error: "That promotion no longer exists." };
    throw error;
  }

  revalidatePromotions();
  return { ok: true, message: "Promotion updated." };
}

export async function deletePromotion(id: string): Promise<ActionResult> {
  await requireAdminPage("/admin/promotions");
  if (!id.trim()) return { ok: false, error: "Choose a valid promotion." };

  try {
    await prisma.promotion.delete({ where: { id } });
  } catch (error) {
    if (isMissingRecord(error)) return { ok: false, error: "That promotion no longer exists." };
    throw error;
  }

  revalidatePromotions();
  return { ok: true, message: "Promotion deleted." };
}

export async function setPromotionActive(id: string, isActive: boolean): Promise<ActionResult> {
  await requireAdminPage("/admin/promotions");
  if (!id.trim()) return { ok: false, error: "Choose a valid promotion." };

  try {
    await prisma.promotion.update({ where: { id }, data: { isActive } });
  } catch (error) {
    if (isMissingRecord(error)) return { ok: false, error: "That promotion no longer exists." };
    throw error;
  }

  revalidatePromotions();
  return { ok: true, message: `Promotion ${isActive ? "activated" : "deactivated"}.` };
}
