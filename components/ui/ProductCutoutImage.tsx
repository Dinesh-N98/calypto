"use client";

import Image from "next/image";
import { productImageBlurDataURL } from "@/lib/productImagePlaceholder";

type ProductCutoutVariant = "card" | "carousel" | "detail" | "thumbnail";

interface ProductCutoutImageProps {
  src: string;
  alt: string;
  variant?: ProductCutoutVariant;
  priority?: boolean;
  className?: string;
}

export function ProductCutoutImage({
  src,
  alt,
  variant = "card",
  priority = false,
  className = "",
}: ProductCutoutImageProps) {
  const wrapperClasses: Record<ProductCutoutVariant, string> = {
    card: "group relative aspect-square w-full overflow-hidden bg-[#eae9df]",
    carousel:
      "group relative h-full w-full overflow-hidden bg-[#181b15]",
    detail:
      "group relative aspect-square w-full overflow-hidden rounded-2xl border border-black/5 bg-[#f7f6f0]",
    thumbnail:
      "group relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-black/5 bg-[#f6f5ef]",
  };

  const spotlightClasses: Record<ProductCutoutVariant, string> = {
    card:
      "absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(255,255,255,0.85)_0%,rgba(235,234,226,0.5)_60%,rgba(215,214,204,0.75)_100%)] transition-opacity duration-300 group-hover:opacity-90",
    carousel:
      "absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(163,189,50,0.18)_0%,rgba(30,35,26,0.5)_45%,rgba(13,14,12,0.95)_100%)]",
    detail:
      "absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.95)_0%,rgba(240,239,232,0.6)_60%,rgba(225,224,216,0.85)_100%)]",
    thumbnail:
      "absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.9)_0%,transparent_75%)]",
  };

  const imageClasses: Record<ProductCutoutVariant, string> = {
    card:
      "object-contain p-5 transition-all duration-500 ease-out group-hover:scale-[1.08] group-hover:-translate-y-1 [filter:drop-shadow(0_10px_15px_rgba(0,0,0,0.14))_drop-shadow(0_3px_5px_rgba(0,0,0,0.08))] sm:p-6",
    carousel:
      "object-contain p-8 transition-transform duration-500 ease-out group-hover:scale-[1.08] group-hover:-translate-y-1 sm:p-10 [filter:drop-shadow(0_14px_22px_rgba(0,0,0,0.55))]",
    detail:
      "object-contain p-8 transition-transform duration-500 ease-out hover:scale-[1.1] sm:p-12 [filter:drop-shadow(0_16px_28px_rgba(0,0,0,0.16))_drop-shadow(0_4px_8px_rgba(0,0,0,0.08))]",
    thumbnail:
      "object-contain p-1.5 transition-transform duration-300 [filter:drop-shadow(0_2px_4px_rgba(0,0,0,0.12))]",
  };

  const sizes: Record<ProductCutoutVariant, string> = {
    card: "(max-width: 767px) 43vw, (max-width: 1023px) 26vw, 19vw",
    carousel: "(max-width: 639px) 82vw, (max-width: 1023px) 54vw, 32vw",
    detail: "(max-width: 1023px) 100vw, 50vw",
    thumbnail: "56px",
  };

  return (
    <div className={`${wrapperClasses[variant]} ${className}`.trim()}>
      <div className={spotlightClasses[variant]} />
      <Image
        src={src}
        alt={alt}
        fill
        priority={priority}
        sizes={sizes[variant]}
        placeholder="blur"
        blurDataURL={productImageBlurDataURL}
        className={imageClasses[variant]}
      />
    </div>
  );
}
