"use client";

import Image from "next/image";
import Link from "next/link";
import { ProductPurchase } from "@/components/ProductPurchase";
import { formatPrice } from "@/lib/currency";
export function ProductCard({
  product,
}: {
  product: { slug: string; name: string; category: string; priceCents: number; imageUrl: string };
}) {
  return (
    <Link className="group block overflow-hidden bg-[#e4e4d9]" href={`/shop/${product.slug}`}>
      <div className="relative aspect-[1/1.1] overflow-hidden">
        <Image
          src={product.imageUrl}
          alt={product.name}
          fill
          sizes="(max-width: 767px) 90vw, 30vw"
          className="object-contain transition-transform duration-[400ms] ease-in-out group-hover:scale-105"
        />
      </div>
      <div className="grid gap-[.45rem] p-[1.3rem]">
        <span className="text-[.6rem] font-extrabold uppercase tracking-[.14em] text-[#697b26]">
          {product.category}
        </span>
        <strong className="text-[1.05rem] uppercase">{product.name}</strong>
        <b className="text-[.85rem]">{formatPrice(product.priceCents)}</b>
        <div onClick={(event) => event.stopPropagation()}>
          <ProductPurchase product={product} />
        </div>
      </div>
    </Link>
  );
}
