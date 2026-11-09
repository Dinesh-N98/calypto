import { describe, expect, it } from "vitest";
import { productCreateFormSchema } from "@/lib/product-form-validation";

const validProduct = {
  name: "River Shad",
  slug: "river-shad",
  brand: "Calypto",
  description: "A soft bait for the next cast.",
  price: "12.00",
  salePrice: "",
  discountAmount: "",
  originalPrice: "",
  saleEndsAt: "",
  categoryId: "category-1",
  tags: "soft bait, river",
  defaultStock: "0",
  isActive: "false",
  trackInventory: "false",
  tieredDiscountsEnabled: "",
};

describe("productCreateFormSchema", () => {
  it("accepts a draft with untracked stock and tags", () => {
    expect(productCreateFormSchema.safeParse(validProduct).success).toBe(true);
  });

  it("requires a sale end date and rejects contradictory price inputs", () => {
    const missingEndDate = productCreateFormSchema.safeParse({
      ...validProduct,
      salePrice: "9.00",
    });
    expect(missingEndDate.success).toBe(false);
    if (!missingEndDate.success) {
      expect(missingEndDate.error.flatten().fieldErrors.saleEndsAt).toContain(
        "Choose an end date for promotional pricing.",
      );
    }

    const contradictoryPrices = productCreateFormSchema.safeParse({
      ...validProduct,
      salePrice: "9.00",
      discountAmount: "2.00",
      originalPrice: "12.00",
      saleEndsAt: "2027-01-01T10:00",
    });
    expect(contradictoryPrices.success).toBe(false);
  });
});
