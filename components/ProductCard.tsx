"use client";

import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/components/CartProvider";
import { useToast } from "@/components/ToastProvider";
import { formatPrice } from "@/lib/currency";

export function ProductCard({
  product,
}: {
  product: { slug: string; name: string; category: string; priceCents: number; imageUrl: string };
}) {
  const { addItem } = useCart();
  const { showToast } = useToast();

  const handleAdd = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    addItem(product);
    showToast(`${product.name} added to cart`);
  };

  return (
    <article className="group overflow-hidden bg-[#e4e4d9]">
      <Link className="block" href={`/shop/${product.slug}`}>
        <div className="relative aspect-square overflow-hidden">
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            sizes="(max-width: 1023px) 50vw, 25vw"
            className="object-contain transition-transform duration-[400ms] ease-in-out group-hover:scale-105"
          />
        </div>
        <div className="grid gap-1 p-2.5">
          <strong className="line-clamp-2 text-xs uppercase leading-tight text-ink sm:text-sm">
            {product.name}
          </strong>
          <b className="text-xs font-bold text-ink">{formatPrice(product.priceCents)}</b>
        </div>
      </Link>
      <div className="px-2.5 pb-2.5">
        <button
          className="inline-flex w-full items-center justify-center gap-1 bg-lime px-2 py-2 text-[.62rem] font-extrabold uppercase tracking-[.06em] text-ink hover:bg-[#b6cf45]"
          type="button"
          onClick={handleAdd}
        >
          Add to Cart <span aria-hidden="true">＋</span>
        </button>
      </div>
    </article>
  );
}
