"use client";

import Image from "next/image";
import Link from "next/link";
import { Plus } from "lucide-react";
import { useCart } from "@/components/CartProvider";
import { WishlistButton } from "@/components/WishlistButton";
import { useToast } from "@/components/ToastProvider";
import { formatPrice } from "@/lib/currency";
import { productImageBlurDataURL } from "@/lib/productImagePlaceholder";

export function ProductCard({
  product,
}: {
  product: {
    id?: string;
    slug: string;
    name: string;
    priceCents: number;
    imageUrl: string;
    variants?: {
      id: string;
      sku: string;
      priceCents: number;
      stock: number;
      size: string | null;
      color: string | null;
      imageUrl: string | null;
    }[];
  };
}) {
  const { addItem } = useCart();
  const { showToast } = useToast();
  const availableVariant = product.variants?.find((variant) => variant.stock > 0);

  const handleAdd = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (!availableVariant) return;
    addItem({
      slug: product.slug,
      variantId: availableVariant.id,
      sku: availableVariant.sku,
      variantLabel: [availableVariant.color, availableVariant.size].filter(Boolean).join(" / "),
      name: product.name,
      priceCents: availableVariant.priceCents,
      imageUrl: availableVariant.imageUrl ?? product.imageUrl,
    });
    showToast(`${product.name} added to cart`);
  };

  return (
    <article className="group relative overflow-hidden bg-[#e4e4d9] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_30px_rgba(0,0,0,0.25)] motion-reduce:transform-none motion-reduce:transition-none">
      <Link className="block" href={`/shop/${product.slug}`}>
        <div className="relative aspect-square overflow-hidden">
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            loading="lazy"
            placeholder="blur"
            blurDataURL={productImageBlurDataURL}
            sizes="(max-width: 767px) 43vw, (max-width: 1023px) 26vw, 19vw"
            className="object-contain transition-transform duration-[400ms] ease-in-out group-hover:scale-105"
          />
        </div>
        <div className="grid gap-1 p-2">
          <strong className="line-clamp-2 text-[.7rem] uppercase leading-tight text-ink sm:text-[.8rem]">
            {product.name}
          </strong>
          <b className="text-xs font-bold text-ink">{formatPrice(product.priceCents)}</b>
        </div>
      </Link>
      {product.id && (
        <WishlistButton
          className="absolute right-2 top-2 z-10 bg-paper/90 text-ink shadow-sm hover:bg-paper"
          productId={product.id}
        />
      )}
      <div className="px-2 pb-2">
        {availableVariant ? (
          <button
            className="inline-flex min-h-11 w-full items-center justify-center gap-1 bg-lime px-2 py-2 text-[.6rem] font-extrabold uppercase tracking-[.05em] text-ink transition-[background-color,transform] duration-300 hover:-translate-y-0.5 hover:bg-[#b6cf45] active:translate-y-0 active:scale-95 motion-reduce:transform-none motion-reduce:transition-colors"
            type="button"
            onClick={handleAdd}
          >
            Add to Cart <Plus aria-hidden="true" className="h-3 w-3" strokeWidth={2} />
          </button>
        ) : (
          <Link
            className="inline-flex min-h-11 w-full items-center justify-center bg-lime px-2 py-2 text-[.6rem] font-extrabold uppercase tracking-[.05em] text-ink"
            href={`/shop/${product.slug}`}
          >
            {product.variants ? "Out of Stock" : "View Options"}
          </Link>
        )}
      </div>
    </article>
  );
}
