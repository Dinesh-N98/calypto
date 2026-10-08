"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useSession } from "next-auth/react";
import { useToast } from "@/components/ToastProvider";

type WishlistContextValue = {
  productIds: Set<string>;
  status: "loading" | "ready" | "unauthenticated" | "error";
  toggleProduct: (productId: string) => Promise<void>;
};

const WishlistContext = createContext<WishlistContextValue | null>(null);
const EMPTY_PRODUCT_IDS = new Set<string>();

async function readError(response: Response) {
  const payload: unknown = await response.json().catch(() => null);
  return payload &&
    typeof payload === "object" &&
    "error" in payload &&
    typeof payload.error === "string"
    ? payload.error
    : "Unable to update your wishlist.";
}

export function WishlistProvider({ children }: { children: ReactNode }) {
  const { data: session, status: sessionStatus } = useSession();
  const { showToast } = useToast();
  const userId = session?.user?.id ?? null;
  const [productIds, setProductIds] = useState<Set<string>>(() => new Set());
  const [loadState, setLoadState] = useState<{
    userId: string;
    status: "loading" | "ready" | "error";
  } | null>(null);

  const status =
    sessionStatus === "loading"
      ? "loading"
      : sessionStatus === "unauthenticated" || !userId
        ? "unauthenticated"
        : loadState?.userId === userId
          ? loadState.status
          : "loading";
  const activeProductIds = loadState?.userId === userId ? productIds : EMPTY_PRODUCT_IDS;

  useEffect(() => {
    if (!userId || sessionStatus !== "authenticated") return;

    const controller = new AbortController();
    void fetch("/api/wishlist", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(await readError(response));
        const payload: unknown = await response.json();
        if (
          !payload ||
          typeof payload !== "object" ||
          !("productIds" in payload) ||
          !Array.isArray(payload.productIds) ||
          !payload.productIds.every((id) => typeof id === "string")
        ) {
          throw new Error("The wishlist response was invalid.");
        }
        if (controller.signal.aborted) return;
        setProductIds(new Set(payload.productIds));
        setLoadState({ userId, status: "ready" });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        console.error("Unable to load the customer wishlist.", error);
        setLoadState({ userId, status: "error" });
        showToast(
          error instanceof Error ? error.message : "Unable to load your wishlist.",
          "error",
        );
      });

    return () => controller.abort();
  }, [sessionStatus, showToast, userId]);

  const toggleProduct = useCallback(
    async (productId: string) => {
      if (!userId) throw new Error("Sign in to save products to your wishlist.");
      if (loadState?.userId !== userId || loadState.status !== "ready") {
        throw new Error("Your wishlist is still loading. Try again in a moment.");
      }

      const isSaved = activeProductIds.has(productId);
      const response = await fetch("/api/wishlist", {
        method: isSaved ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });
      if (!response.ok) throw new Error(await readError(response));
      setProductIds((current) => {
        const next = new Set(current);
        if (isSaved) next.delete(productId);
        else next.add(productId);
        return next;
      });
    },
    [activeProductIds, loadState, userId],
  );

  return (
    <WishlistContext.Provider value={{ productIds: activeProductIds, status, toggleProduct }}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (!context) throw new Error("useWishlist must be used inside WishlistProvider.");
  return context;
}
