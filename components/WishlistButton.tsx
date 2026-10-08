"use client";

import { Heart } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useWishlist } from "@/components/WishlistProvider";
import { useToast } from "@/components/ToastProvider";

export function WishlistButton({
  productId,
  className = "",
}: {
  productId: string;
  className?: string;
}) {
  const { productIds, status, toggleProduct } = useWishlist();
  const { showToast } = useToast();
  const pathname = usePathname();
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const isSaved = productIds.has(productId);

  async function handleClick(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (isSaving) return;
    if (status === "unauthenticated") {
      router.push(`/sign-in?callbackUrl=${encodeURIComponent(pathname)}`);
      return;
    }
    if (status !== "ready") return;

    setIsSaving(true);
    try {
      await toggleProduct(productId);
      showToast(isSaved ? "Removed from wishlist." : "Added to wishlist.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to update your wishlist.";
      showToast(message, "error");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <button
      aria-label={isSaved ? "Remove from wishlist" : "Add to wishlist"}
      aria-pressed={isSaved}
      className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-wait disabled:opacity-60 ${isSaved ? "text-primary" : ""} ${className}`}
      disabled={isSaving || status === "loading" || status === "error"}
      onClick={handleClick}
      type="button"
    >
      <Heart aria-hidden="true" className="h-5 w-5" fill={isSaved ? "currentColor" : "none"} />
    </button>
  );
}
