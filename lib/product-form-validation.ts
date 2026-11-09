import { z } from "zod";

const optionalPrice = z
  .string()
  .regex(/^(?:\d{1,8}(?:\.\d{1,2})?)?$/u, "Enter a valid price.")
  .refine((value) => !value || Number(value) > 0, "Enter a price greater than zero.");

export const productCreateFormSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Enter a product name.")
      .max(160, "Use 160 characters or fewer."),
    slug: z
      .string()
      .trim()
      .min(1, "Enter a URL slug.")
      .max(120, "Use 120 characters or fewer.")
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u, "Use lowercase letters, numbers, and hyphens."),
    brand: z.string().trim().max(100, "Use 100 characters or fewer."),
    description: z
      .string()
      .trim()
      .min(1, "Enter a product description.")
      .max(5000, "Use 5,000 characters or fewer."),
    price: z.string().regex(/^(?=.*[1-9])\d{1,8}(?:\.\d{1,2})?$/u, "Enter a valid price."),
    salePrice: optionalPrice,
    discountAmount: optionalPrice,
    originalPrice: optionalPrice,
    saleEndsAt: z.string(),
    categoryId: z.string().min(1, "Choose a category."),
    tags: z.string(),
    defaultStock: z
      .string()
      .regex(/^\d*$/u, "Enter a non-negative whole number.")
      .refine((value) => !value || Number(value) <= 2_147_483_647, "Stock is too large."),
    isActive: z.enum(["true", "false"]),
    trackInventory: z.enum(["true", "false"]),
    tieredDiscountsEnabled: z.enum(["", "true", "false"]),
  })
  .superRefine((values, context) => {
    if (values.salePrice && values.discountAmount) {
      context.addIssue({
        code: "custom",
        message: "Enter either a sale price or a discount amount, not both.",
        path: ["discountAmount"],
      });
    }

    if (values.discountAmount && !values.originalPrice) {
      context.addIssue({
        code: "custom",
        message: "Enter an original price to calculate the discount amount.",
        path: ["originalPrice"],
      });
    }

    const originalPrice = Number(values.originalPrice || values.price);
    const salePrice = values.discountAmount
      ? originalPrice - Number(values.discountAmount)
      : Number(values.salePrice);
    if (values.discountAmount && salePrice <= 0) {
      context.addIssue({
        code: "custom",
        message: "Discount amount must be less than the original price.",
        path: ["discountAmount"],
      });
    }

    if ((values.salePrice || values.discountAmount) && !values.saleEndsAt) {
      context.addIssue({
        code: "custom",
        message: "Choose an end date for promotional pricing.",
        path: ["saleEndsAt"],
      });
    }

    if (values.saleEndsAt && Number.isNaN(new Date(values.saleEndsAt).getTime())) {
      context.addIssue({
        code: "custom",
        message: "Choose a valid sale end date.",
        path: ["saleEndsAt"],
      });
    }

    const referencePrice = salePrice || Number(values.price);
    if (
      (salePrice > 0 && salePrice >= Number(values.price)) ||
      (values.originalPrice && Number(values.originalPrice) <= referencePrice)
    ) {
      context.addIssue({
        code: "custom",
        message: "Promotional pricing must be lower than the reference price.",
        path: ["salePrice"],
      });
    }

    const tags = values.tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
    if (tags.length > 30 || tags.some((tag) => tag.length > 40)) {
      context.addIssue({
        code: "custom",
        message: "Use up to 30 tags, each 40 characters or fewer.",
        path: ["tags"],
      });
    }
  });

export type ProductCreateFieldErrors = Partial<
  Record<keyof z.infer<typeof productCreateFormSchema>, string>
>;
