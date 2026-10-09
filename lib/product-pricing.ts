export type TierPriceRule = {
  minQuantity: number;
  discountPercentage: number;
};

export function calculateUnitPriceCents({
  basePriceCents,
  variantDiscountPriceCents,
  salePriceCents,
  saleEndsAt,
  quantity,
  tieredDiscounts,
  tieredDiscountsEnabled,
  now = new Date(),
}: {
  basePriceCents: number;
  variantDiscountPriceCents: number | null;
  salePriceCents: number | null;
  saleEndsAt: Date | null;
  quantity: number;
  tieredDiscounts: TierPriceRule[];
  tieredDiscountsEnabled: boolean;
  now?: Date;
}): number {
  const saleHasNotExpired = saleEndsAt === null || saleEndsAt.getTime() > now.getTime();
  const hasActiveProductSale = saleEndsAt !== null && saleHasNotExpired;
  const activePrices = [basePriceCents];
  if (saleHasNotExpired && variantDiscountPriceCents !== null) {
    activePrices.push(variantDiscountPriceCents);
  }
  if (hasActiveProductSale && salePriceCents !== null) {
    activePrices.push(salePriceCents);
  }
  const promotionalPrice = Math.min(...activePrices);
  const appliedTier = (tieredDiscountsEnabled ? tieredDiscounts : [])
    .filter((tier) => tier.minQuantity <= quantity)
    .reduce<TierPriceRule | null>(
      (best, tier) =>
        !best || tier.minQuantity > best.minQuantity ? tier : best,
      null,
    );

  return appliedTier
    ? Math.round((promotionalPrice * (100 - appliedTier.discountPercentage)) / 100)
    : promotionalPrice;
}
