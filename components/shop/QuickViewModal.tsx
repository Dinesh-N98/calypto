"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronLeft, ChevronRight, X } from "lucide-react";
import { useCart } from "@/components/CartProvider";
import { useToast } from "@/components/ToastProvider";
import { CHECKOUT_CURRENCY } from "@/lib/checkout/constants";
import { formatPrice } from "@/lib/currency";
import { trackAddToCart } from "@/lib/ga-events";
import { calculateUnitPriceCents } from "@/lib/product-pricing";

export type QuickViewProduct = {
  id?: string;
  slug: string;
  name: string;
  priceCents: number;
  salePriceCents?: number | null;
  saleEndsAt?: Date | string | null;
  imageUrl: string;
  trackInventory?: boolean;
  pieceLengthInches?: number;
  packWeightGrams?: number;
  piecesPerPack?: number;
  categoryName?: string;
  images?: { url: string; altText: string | null; order?: number }[];
  variants?: {
    id: string;
    sku: string;
    priceCents: number;
    discountPriceCents?: number | null;
    stock: number;
    size: string | null;
    color: string | null;
    imageUrl: string | null;
  }[];
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

export function QuickViewModal({
  product,
  itemListName,
  onClose,
}: {
  product: QuickViewProduct;
  itemListName: "Shop" | "Wishlist";
  onClose: () => void;
}) {
  const { addItem } = useCart();
  const { showToast } = useToast();
  const variants = product.variants ?? [];
  const gallery = useMemo(() => {
    const items = [
      { url: product.imageUrl, altText: product.name },
      ...(product.images ?? []).map((image) => ({
        url: image.url,
        altText: image.altText || product.name,
      })),
    ];
    return items.filter((image, index) => items.findIndex((entry) => entry.url === image.url) === index);
  }, [product.imageUrl, product.images, product.name]);
  const availableVariant = variants.find(
    (variant) => product.trackInventory === false || variant.stock > 0,
  );
  const [selectedVariantId, setSelectedVariantId] = useState(availableVariant?.id ?? "");
  const [activeImage, setActiveImage] = useState(0);
  const [mounted, setMounted] = useState(false);
  const selectedVariant = variants.find((variant) => variant.id === selectedVariantId);
  const colors = [...new Set(variants.flatMap((variant) => (variant.color ? [variant.color] : [])))];
  const sizes = [...new Set(variants.flatMap((variant) => (variant.size ? [variant.size] : [])))];
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
  const colorSizes = selectedVariant?.size ? selectedVariant.size : "";

  useEffect(() => {
    // The portal must wait for hydration before accessing document.body.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  function selectColor(color: string) {
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

  function selectSize(size: string) {
    const candidate =
      variants.find(
        (variant) =>
          variant.size === size &&
          variant.color === selectedVariant?.color &&
          (product.trackInventory === false || variant.stock > 0),
      ) ??
      variants.find(
        (variant) =>
          variant.size === size && (product.trackInventory === false || variant.stock > 0),
      );
    if (candidate) setSelectedVariantId(candidate.id);
  }

  function addToCart() {
    if (!selectedVariant || (product.trackInventory !== false && selectedVariant.stock < 1)) {
      showToast("Choose an available option.", "error");
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
        priceCents: price,
        imageUrl: selectedVariant.imageUrl ?? gallery[activeImage]?.url ?? product.imageUrl,
      },
      1,
    );
    trackAddToCart(
      {
        itemId: selectedVariant.sku,
        itemName: product.name,
        itemCategory: product.categoryName,
        itemVariant: variantLabel,
        itemListName,
        priceCents: price,
        quantity: 1,
      },
      CHECKOUT_CURRENCY,
    );
    showToast(`${product.name}${variantLabel ? ` (${variantLabel})` : ""} added to cart.`);
    onClose();
  }

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/75 p-0 backdrop-blur-sm sm:items-center sm:p-5"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        aria-labelledby="quick-view-title"
        aria-modal="true"
        className="relative mx-auto max-h-[92dvh] w-full max-w-4xl overflow-y-auto rounded-t-2xl border border-white/10 bg-[#141712] text-paper shadow-2xl sm:rounded-xl"
        role="dialog"
      >
        <button
          aria-label="Close quick view"
          className="absolute right-3 top-3 z-20 grid h-11 w-11 place-items-center rounded-full border border-white/10 bg-black/50 text-paper backdrop-blur-md transition hover:bg-black/70"
          onClick={onClose}
          type="button"
        >
          <X aria-hidden="true" className="h-5 w-5" />
        </button>
        <div className="grid md:grid-cols-2">
          <div className="relative min-h-[18rem] bg-[#0f110d] sm:min-h-[25rem]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(163,189,50,0.12)_0%,transparent_70%)]" />
            <Image
              alt={gallery[activeImage]?.altText ?? product.name}
              className="object-contain p-8 sm:p-12"
              fill
              sizes="(max-width: 767px) 100vw, 50vw"
              src={gallery[activeImage]?.url ?? product.imageUrl}
            />
            {gallery.length > 1 && (
              <>
                <button
                  aria-label="Previous image"
                  className="absolute left-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-white/10 bg-black/50"
                  onClick={() => setActiveImage((activeImage - 1 + gallery.length) % gallery.length)}
                  type="button"
                >
                  <ChevronLeft aria-hidden="true" className="h-5 w-5" />
                </button>
                <button
                  aria-label="Next image"
                  className="absolute right-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-white/10 bg-black/50"
                  onClick={() => setActiveImage((activeImage + 1) % gallery.length)}
                  type="button"
                >
                  <ChevronRight aria-hidden="true" className="h-5 w-5" />
                </button>
              </>
            )}
          </div>

          <div className="p-5 sm:p-8">
            {product.categoryName && (
              <p className="text-[.65rem] font-extrabold uppercase tracking-[.15em] text-lime">
                {product.categoryName}
              </p>
            )}
            <h2 className="mt-2 text-2xl font-black uppercase leading-tight tracking-tight sm:text-3xl" id="quick-view-title">
              {product.name}
            </h2>
            <p className="mt-3 text-2xl font-black text-lime">{formatPrice(price)}</p>

            <div className="mt-5 grid grid-cols-3 gap-2 border-y border-white/10 py-4">
              <Spec label="Length" value={product.pieceLengthInches ? `${product.pieceLengthInches} in` : "—"} />
              <Spec label="Pack weight" value={product.packWeightGrams ? `${product.packWeightGrams} g` : "—"} />
              <Spec label="Per pack" value={product.piecesPerPack ? `${product.piecesPerPack} pcs` : "—"} />
            </div>

            {colors.length > 0 && (
              <fieldset className="mt-5">
                <legend className="mb-2 text-xs font-extrabold uppercase tracking-wider">
                  Color{selectedVariant?.color ? `: ${selectedVariant.color}` : ""}
                </legend>
                <div className="flex flex-wrap gap-2">
                  {colors.map((color) => {
                    const hasStock = variants.some(
                      (variant) =>
                        variant.color === color &&
                        (product.trackInventory === false || variant.stock > 0),
                    );
                    return (
                      <button
                        aria-label={`Choose ${color}`}
                        aria-pressed={selectedVariant?.color === color}
                        className={`grid h-9 w-9 place-items-center rounded-full border-2 ${selectedVariant?.color === color ? "border-lime" : "border-white/20"} disabled:opacity-40`}
                        disabled={!hasStock}
                        key={color}
                        onClick={() => selectColor(color)}
                        style={{ backgroundColor: swatchColor(color) }}
                        type="button"
                      >
                        {selectedVariant?.color === color && (
                          <Check aria-hidden="true" className="h-4 w-4 text-white drop-shadow" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            )}

            {sizes.length > 0 && (
              <fieldset className="mt-5">
                <legend className="mb-2 text-xs font-extrabold uppercase tracking-wider">
                  Size{colorSizes ? `: ${colorSizes}` : ""}
                </legend>
                <div className="flex flex-wrap gap-2">
                  {sizes.map((size) => {
                    const hasStock = variants.some(
                      (variant) =>
                        variant.size === size &&
                        (product.trackInventory === false || variant.stock > 0),
                    );
                    return (
                      <button
                        aria-pressed={selectedVariant?.size === size}
                        className={`min-h-10 rounded-md border px-3 text-xs font-bold uppercase ${selectedVariant?.size === size ? "border-lime bg-lime text-ink" : "border-white/15 bg-white/5 text-paper"} disabled:opacity-40`}
                        disabled={!hasStock}
                        key={size}
                        onClick={() => selectSize(size)}
                        type="button"
                      >
                        {size}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            )}

            <p className="mt-4 text-xs font-medium text-muted">
              {product.trackInventory === false
                ? "Available to order"
                : selectedVariant && selectedVariant.stock > 0
                  ? `${selectedVariant.stock} in stock`
                  : "Currently unavailable"}
            </p>
            <button
              className="mt-3 min-h-12 w-full rounded-md bg-lime px-4 text-sm font-black uppercase tracking-wide text-ink transition hover:bg-[#b6cf45] disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!selectedVariant || (product.trackInventory !== false && selectedVariant.stock < 1)}
              onClick={addToCart}
              type="button"
            >
              Add to cart · {formatPrice(price)}
            </button>
          </div>
        </div>
      </section>
    </div>,
    document.body,
  );
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[.58rem] font-bold uppercase tracking-wider text-muted">{label}</p>
      <p className="mt-1 text-sm font-extrabold">{value}</p>
    </div>
  );
}
