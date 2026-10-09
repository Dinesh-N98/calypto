"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Share2, ShoppingBag, Star } from "lucide-react";
import { useCart } from "@/components/CartProvider";
import { QuantitySelector } from "@/components/QuantitySelector";
import { useToast } from "@/components/ToastProvider";
import { WishlistButton } from "@/components/WishlistButton";
import { formatPrice } from "@/lib/currency";
import { calculateUnitPriceCents } from "@/lib/product-pricing";
import { productImageBlurDataURL } from "@/lib/productImagePlaceholder";

type Variant = {
  id: string;
  sku: string;
  priceCents: number;
  discountPriceCents: number | null;
  stock: number;
  size: string | null;
  color: string | null;
  imageUrl: string | null;
};

type ProductDetailExperienceProps = {
  product: {
    id: string;
    slug: string;
    name: string;
    description: string;
    brand: string | null;
    imageUrl: string;
    priceCents: number;
    salePriceCents: number | null;
    originalPriceCents: number | null;
    saleEndsAt: Date | null;
    tieredDiscountsEnabled: boolean;
  };
  images: { id: string; url: string; altText: string | null }[];
  variants: Variant[];
  tieredDiscounts: { minQuantity: number; discountPercentage: number }[];
  averageRating: number;
  reviewCount: number;
  categoryName: string;
};

function colorValue(color: string): string | null {
  const namedColors: Record<string, string> = {
    black: "#171717",
    blue: "#2563eb",
    green: "#4d7c0f",
    navy: "#172554",
    orange: "#ea580c",
    pink: "#ec4899",
    red: "#dc2626",
    white: "#ffffff",
    yellow: "#eab308",
  };
  const normalized = color.trim().toLowerCase();
  if (/^#[\da-f]{3}(?:[\da-f]{3})?$/i.test(normalized)) return normalized;
  return namedColors[normalized] ?? null;
}

function formatCountdown(milliseconds: number): string {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;
  return `${days ? `${days}d ` : ""}${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function ProductDetailExperience({
  product,
  images,
  variants,
  tieredDiscounts,
  averageRating,
  reviewCount,
  categoryName,
}: ProductDetailExperienceProps) {
  const router = useRouter();
  const { addItem } = useCart();
  const { showToast } = useToast();
  const gallery = useMemo(() => {
    const values = [product.imageUrl, ...images.map((image) => image.url)];
    return [...new Set(values)].map((url) => ({
      url,
      altText: images.find((image) => image.url === url)?.altText || product.name,
    }));
  }, [images, product.imageUrl, product.name]);
  const firstAvailable = variants.find((variant) => variant.stock > 0) ?? variants[0];
  const [selectedVariantId, setSelectedVariantId] = useState(firstAvailable?.id ?? "");
  const [activeImageIndex, setActiveImageIndex] = useState(() => {
    const variantImageUrl = firstAvailable?.imageUrl;
    const index = variantImageUrl ? gallery.findIndex((image) => image.url === variantImageUrl) : -1;
    return index >= 0 ? index : 0;
  });
  const [quantity, setQuantity] = useState(1);
  const [remainingMs, setRemainingMs] = useState(0);
  const selectedVariant = variants.find((variant) => variant.id === selectedVariantId);
  const colors = [...new Set(variants.flatMap((variant) => (variant.color ? [variant.color] : [])))];
  const sizes = [...new Set(variants.flatMap((variant) => (variant.size ? [variant.size] : [])))];
  const selectedColor = selectedVariant?.color ?? null;
  const hasActiveSale = remainingMs > 0;
  const currentUnitPrice = selectedVariant
    ? calculateUnitPriceCents({
        basePriceCents: selectedVariant.priceCents,
        variantDiscountPriceCents: selectedVariant.discountPriceCents,
        salePriceCents: product.salePriceCents,
        saleEndsAt: product.saleEndsAt,
        quantity,
        tieredDiscounts,
        tieredDiscountsEnabled: product.tieredDiscountsEnabled,
      })
    : product.priceCents;
  const saleUnitPrice = selectedVariant
    ? calculateUnitPriceCents({
        basePriceCents: selectedVariant.priceCents,
        variantDiscountPriceCents: selectedVariant.discountPriceCents,
        salePriceCents: product.salePriceCents,
        saleEndsAt: product.saleEndsAt,
        quantity: 1,
        tieredDiscounts: [],
        tieredDiscountsEnabled: false,
      })
    : product.priceCents;
  const referencePrice = Math.max(
    product.originalPriceCents ?? 0,
    selectedVariant?.priceCents ?? product.priceCents,
  );
  const savingPercent =
    referencePrice > saleUnitPrice
      ? Math.round(((referencePrice - saleUnitPrice) / referencePrice) * 100)
      : 0;
  const applicableTier = [...tieredDiscounts]
    .filter((tier) => quantity >= tier.minQuantity)
    .sort((left, right) => right.minQuantity - left.minQuantity)[0];
  const installmentCents = Math.ceil(currentUnitPrice / 3);

  useEffect(() => {
    if (!product.saleEndsAt) return;
    const update = () => setRemainingMs(product.saleEndsAt!.getTime() - Date.now());
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [product.saleEndsAt]);

  function chooseColor(color: string) {
    const matching = variants.find(
      (variant) => variant.color === color && variant.size === selectedVariant?.size && variant.stock > 0,
    ) ?? variants.find((variant) => variant.color === color && variant.stock > 0);
    if (matching) selectVariant(matching);
  }

  function chooseSize(size: string) {
    const matching = variants.find(
      (variant) => variant.size === size && variant.color === selectedColor && variant.stock > 0,
    ) ?? variants.find((variant) => variant.size === size && variant.stock > 0);
    if (matching) selectVariant(matching);
  }

  function selectVariant(variant: Variant) {
    setSelectedVariantId(variant.id);
    if (variant.imageUrl) {
      const index = gallery.findIndex((image) => image.url === variant.imageUrl);
      if (index >= 0) setActiveImageIndex(index);
    }
  }

  function addSelectedItem(goToCheckout: boolean) {
    if (!selectedVariant || selectedVariant.stock < quantity) {
      showToast("Choose an available variant and quantity.", "error");
      return;
    }
    const variantLabel = [selectedVariant.color, selectedVariant.size].filter(Boolean).join(" / ");
    addItem(
      {
        slug: product.slug,
        variantId: selectedVariant.id,
        sku: selectedVariant.sku,
        variantLabel,
        name: product.name,
        priceCents: currentUnitPrice,
        imageUrl: selectedVariant.imageUrl ?? gallery[activeImageIndex]?.url ?? product.imageUrl,
      },
      quantity,
    );
    showToast(`${product.name}${variantLabel ? ` (${variantLabel})` : ""} added to cart.`);
    if (goToCheckout) {
      router.push(
        `/cart?buyNow=${encodeURIComponent(selectedVariant.id)}&quantity=${quantity}`,
      );
    }
  }

  async function shareProduct() {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: product.name, url });
      else {
        await navigator.clipboard.writeText(url);
        showToast("Product link copied.");
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      showToast("Unable to share this product.", "error");
    }
  }

  return (
    <section className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,.9fr)] lg:gap-12">
      <div>
        <div className="relative aspect-square overflow-hidden rounded-sm bg-[#f0f0e8]">
          <Image
            alt={gallery[activeImageIndex]?.altText ?? product.name}
            blurDataURL={productImageBlurDataURL}
            className="object-contain p-5"
            fill
            priority
            sizes="(max-width: 1023px) 90vw, 52vw"
            src={gallery[activeImageIndex]?.url ?? product.imageUrl}
          />
          {gallery.length > 1 && (
            <>
              <button
                aria-label="Previous product image"
                className="absolute left-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/90 shadow"
                onClick={() =>
                  setActiveImageIndex((index) => (index - 1 + gallery.length) % gallery.length)
                }
                type="button"
              >
                <ChevronLeft aria-hidden="true" className="h-5 w-5" />
              </button>
              <button
                aria-label="Next product image"
                className="absolute right-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/90 shadow"
                onClick={() => setActiveImageIndex((index) => (index + 1) % gallery.length)}
                type="button"
              >
                <ChevronRight aria-hidden="true" className="h-5 w-5" />
              </button>
            </>
          )}
        </div>
        {gallery.length > 1 && (
          <div aria-label="Product images" className="mt-3 flex gap-2 overflow-x-auto">
            {gallery.map((image, index) => (
              <button
                aria-label={`Show product image ${index + 1}`}
                aria-pressed={index === activeImageIndex}
                className={`relative h-16 w-16 shrink-0 overflow-hidden border-2 bg-[#f0f0e8] ${index === activeImageIndex ? "border-[#708323]" : "border-transparent"}`}
                key={image.url}
                onClick={() => setActiveImageIndex(index)}
                type="button"
              >
                <Image alt="" className="object-contain p-1" fill sizes="64px" src={image.url} />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="self-start">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xs font-bold uppercase tracking-[.15em] text-[#718126]">
            {categoryName}
          </p>
          {product.brand && (
            <span className="rounded-full border border-ink/15 px-3 py-1 text-[.65rem] font-bold uppercase tracking-[.1em]">
              {product.brand}
            </span>
          )}
        </div>
        <div className="mt-3 flex items-start justify-between gap-4">
          <h1 className="text-3xl font-black leading-tight tracking-[-.04em] md:text-4xl">
            {product.name}
          </h1>
          <div className="flex shrink-0 gap-1">
            <button
              aria-label="Share product"
              className="grid h-11 w-11 place-items-center rounded-full border border-ink/15 hover:bg-ink/5"
              onClick={() => void shareProduct()}
              type="button"
            >
              <Share2 aria-hidden="true" className="h-5 w-5" />
            </button>
            <WishlistButton
              className="border border-ink/15 text-ink hover:bg-ink/5"
              productId={product.id}
            />
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2 text-sm">
          <span aria-label={`${averageRating.toFixed(1)} out of 5 stars`} className="flex text-amber-500">
            {Array.from({ length: 5 }, (_, index) => (
              <Star
                aria-hidden="true"
                className="h-4 w-4"
                fill={index < Math.round(averageRating) ? "currentColor" : "none"}
                key={index}
              />
            ))}
          </span>
          <span className="font-semibold">{averageRating ? averageRating.toFixed(1) : "New"}</span>
          <span className="text-[#62665c]">Ratings ({reviewCount})</span>
        </div>
        <p className="mt-5 text-sm leading-7 text-[#55584e]">{product.description}</p>

        {savingPercent > 0 && (
          <div className="mt-6 rounded-md bg-[#fff2e5] p-4">
            <p className="text-xs font-extrabold uppercase tracking-[.12em] text-[#c54b14]">
              {hasActiveSale ? "Limited-time deal" : "Special price"}
              <span className="ml-2">-{savingPercent}%</span>
            </p>
            {hasActiveSale && product.saleEndsAt && saleUnitPrice < referencePrice && (
              <p className="mt-1 text-sm text-[#71330f]">
                Deal ends in <strong className="tabular-nums">{formatCountdown(remainingMs)}</strong>
              </p>
            )}
          </div>
        )}

        <div className="mt-5 flex flex-wrap items-baseline gap-3">
          <p className="text-3xl font-black">{formatPrice(currentUnitPrice)}</p>
          {referencePrice > saleUnitPrice && (
            <>
              <p className="text-base text-[#777b70] line-through">{formatPrice(referencePrice)}</p>
              <p className="text-sm font-bold text-[#c54b14]">-{savingPercent}%</p>
            </>
          )}
        </div>
        <p className="mt-1 text-xs text-[#62665c]">Price per item after applicable quantity discounts</p>
        <p className="mt-4 rounded-md border border-ink/10 bg-white/60 px-3 py-2 text-sm text-[#55584e]">
          Informational estimate: 3 monthly installments from{" "}
          <strong>{formatPrice(installmentCents)}</strong> per month. Provider terms may vary.
        </p>

        {colors.length > 0 && (
          <fieldset className="mt-6">
            <legend className="mb-2 text-xs font-extrabold uppercase tracking-[.1em]">
              Color: {selectedColor ?? "Select"}
            </legend>
            <div className="flex flex-wrap gap-2">
              {colors.map((color) => {
                const matchingColorVariants = variants.filter((variant) => variant.color === color);
                const representative = matchingColorVariants.find((variant) => variant.imageUrl) ??
                  matchingColorVariants[0];
                const disabled = !matchingColorVariants.some((variant) => variant.stock > 0);
                const swatch = colorValue(color);
                return (
                  <button
                    aria-label={color}
                    aria-pressed={selectedColor === color}
                    className={`inline-flex min-h-11 items-center gap-2 rounded-md border-2 px-2.5 text-xs font-bold ${selectedColor === color ? "border-[#718126] bg-[#edf2d9]" : "border-ink/15 bg-white"} ${disabled ? "cursor-not-allowed opacity-40" : ""}`}
                    disabled={disabled}
                    key={color}
                    onClick={() => chooseColor(color)}
                    title={color}
                    type="button"
                  >
                    {representative?.imageUrl ? (
                      <span className="relative h-8 w-8 shrink-0 overflow-hidden rounded border border-black/10 bg-[#f0f0e8]">
                        <Image
                          alt=""
                          className="object-contain"
                          fill
                          sizes="32px"
                          src={representative.imageUrl}
                        />
                      </span>
                    ) : swatch ? (
                      <span
                        aria-hidden="true"
                        className="h-6 w-6 shrink-0 rounded-full border border-black/20"
                        style={{ backgroundColor: swatch }}
                      />
                    ) : null}
                    <span>{color}</span>
                  </button>
                );
              })}
            </div>
          </fieldset>
        )}

        {sizes.length > 0 && (
          <fieldset className="mt-5">
            <legend className="mb-2 text-xs font-extrabold uppercase tracking-[.1em]">
              Size / pack: {selectedVariant?.size ?? "Select"}
            </legend>
            <div className="flex flex-wrap gap-2">
              {sizes.map((size) => {
                const matching = variants.find(
                  (variant) => variant.size === size && variant.color === selectedColor,
                );
                const disabled = !variants.some(
                  (variant) => variant.size === size && variant.color === selectedColor && variant.stock > 0,
                );
                return (
                  <button
                    aria-pressed={selectedVariant?.size === size}
                    className={`min-h-11 border px-4 text-sm font-bold ${selectedVariant?.size === size ? "border-[#718126] bg-[#edf2d9]" : "border-ink/20"} ${disabled ? "cursor-not-allowed opacity-40" : ""}`}
                    disabled={disabled}
                    key={size}
                    onClick={() => chooseSize(size)}
                    type="button"
                  >
                    {size}
                    {matching && matching.stock === 0 ? " · Out of stock" : ""}
                  </button>
                );
              })}
            </div>
          </fieldset>
        )}

        {product.tieredDiscountsEnabled && tieredDiscounts.length > 0 && (
          <div className="mt-6 rounded-md border border-[#dbe4b5] bg-[#f7f9ed] p-4">
            <p className="text-xs font-extrabold uppercase tracking-[.1em]">Buy more, save more</p>
            <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
              {tieredDiscounts.map((tier) => (
                <li
                  className={applicableTier?.minQuantity === tier.minQuantity ? "font-bold text-[#536519]" : ""}
                  key={tier.minQuantity}
                >
                  Buy {tier.minQuantity}, save {tier.discountPercentage}%
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
          <QuantitySelector
            value={quantity}
            onChange={(nextQuantity) =>
              setQuantity(Math.max(1, Math.min(nextQuantity, selectedVariant?.stock ?? nextQuantity)))
            }
          />
          <p className="text-sm text-[#62665c]">
            {selectedVariant ? `${selectedVariant.stock} available · SKU ${selectedVariant.sku}` : "Select a variant"}
          </p>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <button
            className="inline-flex min-h-12 items-center justify-center gap-2 bg-[#a3bd32] px-5 text-sm font-extrabold uppercase tracking-[.08em] text-ink hover:bg-[#b6cf45] disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!selectedVariant || selectedVariant.stock < quantity}
            onClick={() => addSelectedItem(true)}
            type="button"
          >
            <ShoppingBag aria-hidden="true" className="h-4 w-4" /> Buy Now
          </button>
          <button
            className="inline-flex min-h-12 items-center justify-center gap-2 border border-ink px-5 text-sm font-extrabold uppercase tracking-[.08em] hover:bg-ink hover:text-paper disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!selectedVariant || selectedVariant.stock < quantity}
            onClick={() => addSelectedItem(false)}
            type="button"
          >
            Add to Cart
          </button>
        </div>
      </div>
    </section>
  );
}
