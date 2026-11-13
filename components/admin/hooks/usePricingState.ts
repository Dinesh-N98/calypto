"use client";

import { useState } from "react";

type PricingInitialValues = {
  priceInput?: string;
  salePriceInput?: string;
  discountAmountInput?: string;
  originalPriceInput?: string;
};

export function usePricingState(initialValues: PricingInitialValues = {}) {
  const [priceInput, setPriceInput] = useState(initialValues.priceInput ?? "");
  const [salePriceInput, setSalePriceInputState] = useState(initialValues.salePriceInput ?? "");
  const [discountAmountInput, setDiscountAmountInputState] = useState(
    initialValues.discountAmountInput ?? "",
  );
  const [originalPriceInput, setOriginalPriceInput] = useState(
    initialValues.originalPriceInput ?? "",
  );

  function setSalePriceInput(value: string) {
    setSalePriceInputState(value);
    if (value) setDiscountAmountInputState("");
  }

  function setDiscountAmountInput(value: string) {
    setDiscountAmountInputState(value);
    if (value) setSalePriceInputState("");
  }

  const basePrice = Number(originalPriceInput || priceInput);
  const finalSalePrice = discountAmountInput
    ? basePrice - Number(discountAmountInput)
    : Number(salePriceInput);
  const savingsPercent =
    basePrice > 0 && finalSalePrice > 0 && finalSalePrice < basePrice
      ? Math.round(((basePrice - finalSalePrice) / basePrice) * 100)
      : null;

  return {
    priceInput,
    setPriceInput,
    salePriceInput,
    setSalePriceInput,
    discountAmountInput,
    setDiscountAmountInput,
    originalPriceInput,
    setOriginalPriceInput,
    basePrice,
    finalSalePrice,
    savingsPercent,
  };
}
