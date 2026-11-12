"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight, Check, Star } from "lucide-react";
import { QuickViewModal, type QuickViewProduct } from "@/components/shop/QuickViewModal";
import { WishlistButton } from "@/components/WishlistButton";
import { formatPrice } from "@/lib/currency";
import { calculateUnitPriceCents } from "@/lib/product-pricing";

type ProductCardProduct = QuickViewProduct & {
  id?: string;
  averageRating?: number;
  reviewCount?: number;
  reviews?: { rating: number }[];
};

function swatchColor(value: string): string {
  const colors: Record<string, string> = {
    black: "#171717",
    blue: "#2563eb",
    green: "#4d7c0f",
    gold: "#d4a72c",
    orange: "#ea580c",
    purple: "#7e22ce",
    red: "#dc2626",
    silver: "#cbd5e1",
    white: "#ffffff",
    yellow: "#eab308",
  };
  const normalized = value.trim().toLowerCase();
  if (/^#[\da-f]{3}(?:[\da-f]{3})?$/i.test(normalized)) return normalized;
  return colors[normalized] ?? "#a3bd32";
}

export function ProductCard({
  product,
  itemListName,
}: {
  product: ProductCardProduct;
  itemListName: "Shop" | "Wishlist";
}) {
  const variants = product.variants ?? [];
  const [selectedVariantId, setSelectedVariantId] = useState(
    variants.find((variant) => product.trackInventory === false || variant.stock > 0)?.id ?? "",
  );
  const [quickViewOpen, setQuickViewOpen] = useState(false);
  const selectedVariant = variants.find((variant) => variant.id === selectedVariantId);
  const colors = [...new Set(variants.flatMap((variant) => (variant.color ? [variant.color] : [])))];
  const saleEndsAt = product.saleEndsAt ? new Date(product.saleEndsAt) : null;
  const price = selectedVariant
    ? calculateUnitPriceCents({
        basePriceCents: selectedVariant.priceCents,
        variantDiscountPriceCents: selectedVariant.discountPriceCents ?? null,
        salePriceCents: product.salePriceCents ?? null,
        saleEndsAt,
        quantity: 1,
        tieredDiscounts: [],
        tieredDiscountsEnabled: false,
      })
    : product.priceCents;
  const isOnSale = Boolean(
    product.salePriceCents != null ||
      variants.some((variant) => variant.discountPriceCents != null),
  );
  const hasInventory = product.trackInventory !== false && variants.length > 0;
  const stock = selectedVariant?.stock ?? 0;
  const isOutOfStock = hasInventory && (selectedVariant ? stock === 0 : variants.every((variant) => variant.stock === 0));
  const isLowStock =
    hasInventory &&
    !isOutOfStock &&
    selectedVariant !== undefined &&
    stock > 0 &&
    stock <= 5;
  const secondImage = product.images?.[0]?.url;
  const imageSrc = selectedVariant?.imageUrl ?? product.imageUrl;
  const averageRating =
    product.averageRating ??
    (product.reviews?.length
      ? product.reviews.reduce((sum, review) => sum + review.rating, 0) / product.reviews.length
      : 0);
  const reviewCount = product.reviewCount ?? product.reviews?.length ?? 0;

  function chooseColor(color: string) {
    const candidate =
      variants.find(
        (variant) =>
          variant.color === color &&
          variant.size === selectedVariant?.size &&
          (product.trackInventory === false || variant.stock > 0),
      ) ??
      variants.find(
        (variant) =>
          variant.color === color && (product.trackInventory === false || variant.stock > 0),
      );
    if (candidate) setSelectedVariantId(candidate.id);
  }

  return (
    <>
      <article className="group relative overflow-hidden rounded-xl border border-white/10 bg-[#131611] transition duration-300 hover:-translate-y-1 hover:border-lime/30 hover:shadow-[0_12px_34px_rgba(0,0,0,.32),0_0_24px_rgba(163,189,50,.08)] motion-reduce:transform-none motion-reduce:transition-none">
        <div className="relative">
          <Link
            aria-label={`View ${product.name}`}
            className="relative block aspect-square overflow-hidden bg-[#10120e]"
            href={`/shop/${product.slug}`}
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(163,189,50,0.07)_0%,transparent_70%)] opacity-70 transition-opacity duration-500 group-hover:opacity-100" />
            <Image
              alt={product.name}
              className="object-contain p-5 transition-[opacity,transform] duration-500 ease-out group-hover:scale-[1.04] sm:p-7"
              fill
              sizes="(max-width: 639px) 46vw, (max-width: 1023px) 30vw, 23vw"
              src={imageSrc}
            />
            {secondImage && secondImage !== imageSrc && (
              <Image
                alt={product.images?.[0]?.altText || `${product.name}, alternate view`}
                className="object-contain p-5 opacity-0 transition-[opacity,transform] duration-500 group-hover:scale-[1.04] group-hover:opacity-100 sm:p-7"
                fill
                sizes="(max-width: 639px) 46vw, (max-width: 1023px) 30vw, 23vw"
                src={secondImage}
              />
            )}
          </Link>

          <div className="pointer-events-none absolute left-2 top-2 z-10 flex max-w-[75%] flex-wrap gap-1.5 sm:left-3 sm:top-3">
            {isOnSale && <span className="rounded-sm bg-lime px-2 py-1 text-[.56rem] font-black uppercase tracking-wide text-ink">Sale</span>}
            {isLowStock && <span className="rounded-sm border border-amber-300/30 bg-black/70 px-2 py-1 text-[.56rem] font-black uppercase tracking-wide text-amber-200">Low stock</span>}
            {isOutOfStock && <span className="rounded-sm border border-white/15 bg-black/70 px-2 py-1 text-[.56rem] font-black uppercase tracking-wide text-paper">Out of stock</span>}
          </div>

          {product.id && (
            <WishlistButton
              className="absolute right-2 top-2 z-10 min-h-10 min-w-10 border border-white/10 bg-black/50 text-paper shadow-lg backdrop-blur-md hover:bg-black/70 sm:right-3 sm:top-3"
              productId={product.id}
            />
          )}
        </div>

        <div className="p-3 sm:p-4">
          <div className="flex min-h-[3.3rem] items-start justify-between gap-2">
            <Link className="min-w-0" href={`/shop/${product.slug}`}>
              <h2 className="line-clamp-2 text-[.72rem] font-black uppercase leading-[1.2] tracking-[-.02em] text-paper transition-colors group-hover:text-lime sm:text-sm">
                {product.name}
              </h2>
            </Link>
            <div className="shrink-0 text-right">
              <p className="text-sm font-black tabular-nums text-paper sm:text-base">{formatPrice(price)}</p>
              {selectedVariant?.discountPriceCents != null && selectedVariant.discountPriceCents < selectedVariant.priceCents && (
                <p className="text-[.62rem] text-muted line-through">{formatPrice(selectedVariant.priceCents)}</p>
              )}
            </div>
          </div>

          {reviewCount > 0 && (
            <p className="mt-1 flex items-center gap-1 text-[.65rem] font-semibold text-muted">
              <Star aria-hidden="true" className="h-3.5 w-3.5 fill-lime text-lime" />
              <span className="text-paper">{averageRating.toFixed(1)}</span>
              <span>({reviewCount})</span>
            </p>
          )}

          <div
            className={`mt-3 flex min-h-8 items-center gap-2 ${colors.length > 0 ? "justify-between" : "justify-end"}`}
          >
            {colors.length > 0 && (
              <div aria-label="Available colors" className="flex flex-wrap gap-1.5">
                {colors.slice(0, 5).map((color) => (
                  <button
                    aria-label={`Choose ${color}`}
                    aria-pressed={selectedVariant?.color === color}
                    className={`h-6 w-6 rounded-full border-2 transition-transform hover:scale-110 ${selectedVariant?.color === color ? "border-lime ring-1 ring-lime/30" : "border-white/25"}`}
                    key={color}
                    onClick={() => chooseColor(color)}
                    onMouseEnter={() => chooseColor(color)}
                    style={{ backgroundColor: swatchColor(color) }}
                    title={color}
                    type="button"
                  >
                    {selectedVariant?.color === color && (
                      <Check aria-hidden="true" className="mx-auto h-3 w-3 text-white drop-shadow" />
                    )}
                  </button>
                ))}
                {colors.length > 5 && (
                  <span className="self-center text-[.62rem] font-bold text-muted">+{colors.length - 5}</span>
                )}
              </div>
            )}
            <button
              className="inline-flex min-h-8 shrink-0 items-center gap-1 text-[.58rem] font-extrabold uppercase tracking-wide text-muted transition hover:text-lime"
              onClick={() => setQuickViewOpen(true)}
              type="button"
            >
              Quick view <ArrowUpRight aria-hidden="true" className="h-3 w-3" />
            </button>
          </div>

          <Link
            aria-label={`View product details for ${product.name}`}
            className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-olive bg-olive px-3 py-2 text-xs font-black uppercase tracking-[.12em] text-paper transition-[background-color,border-color,transform] duration-200 hover:-translate-y-0.5 hover:border-lime/60 hover:bg-olive-bright active:translate-y-0 active:scale-[.98] motion-reduce:transform-none"
            href={`/shop/${product.slug}`}
            prefetch
          >
            View product
            <ArrowUpRight
              aria-hidden="true"
              className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transform-none"
            />
          </Link>
        </div>
      </article>
      {quickViewOpen && (
        <QuickViewModal
          itemListName={itemListName}
          onClose={() => setQuickViewOpen(false)}
          product={product}
        />
      )}
    </>
  );
}
