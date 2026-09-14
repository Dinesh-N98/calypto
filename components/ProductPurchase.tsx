"use client";

import { useState } from "react";
import { useCart } from "@/components/CartProvider";
import { QuantitySelector } from "@/components/QuantitySelector";

type ProductPurchaseProps = {
  product: { slug: string; name: string; priceCents: number; imageUrl: string };
  prominent?: boolean;
};

export function ProductPurchase({ product, prominent = false }: ProductPurchaseProps) {
  const [quantity, setQuantity] = useState(1);
  const { addItem } = useCart();

  const handleAdd = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    addItem(product, quantity);
  };

  return (
    <div className={`flex ${prominent ? "flex-col gap-4 sm:flex-row" : "flex-col gap-3"}`}>
      <QuantitySelector value={quantity} onChange={setQuantity} />
      <button
        className={`inline-flex items-center justify-center gap-4 bg-lime px-5 py-3 text-[.7rem] font-extrabold uppercase tracking-[.1em] text-ink hover:bg-[#b6cf45] ${prominent ? "min-h-11 flex-1" : "w-full"}`}
        type="button"
        onClick={handleAdd}
      >
        Add to Cart <span>＋</span>
      </button>
    </div>
  );
}
