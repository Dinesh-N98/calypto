"use client";

import { createContext, startTransition, useCallback, useContext, useEffect, useState } from "react";

export type CartItem = {
  slug: string;
  variantId: string;
  sku: string;
  variantLabel: string;
  name: string;
  priceCents: number;
  imageUrl: string;
  quantity: number;
};

type CartProduct = Omit<CartItem, "quantity">;
type CartContextValue = {
  items: CartItem[];
  itemCount: number;
  addItem: (item: CartProduct, quantity?: number) => void;
  updateQuantity: (variantId: string, quantity: number) => void;
  removeItem: (variantId: string) => void;
  clearCart: () => void;
};

const CART_STORAGE_KEY = "calypto-cart";
const CartContext = createContext<CartContextValue | null>(null);

function isCartItem(value: unknown): value is CartItem {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<CartItem>;
  return (
    typeof item.slug === "string" &&
    typeof item.variantId === "string" &&
    typeof item.sku === "string" &&
    typeof item.variantLabel === "string" &&
    typeof item.name === "string" &&
    typeof item.priceCents === "number" &&
    typeof item.imageUrl === "string" &&
    typeof item.quantity === "number" &&
    Number.isInteger(item.quantity) &&
    item.quantity > 0
  );
}

function migrateStoredCartItem(value: unknown): CartItem | null {
  if (isCartItem(value)) return value;
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const item = value as Partial<CartItem>;
  if (
    "variantId" in item ||
    typeof item.slug !== "string" ||
    typeof item.name !== "string" ||
    typeof item.priceCents !== "number" ||
    typeof item.imageUrl !== "string" ||
    typeof item.quantity !== "number" ||
    !Number.isSafeInteger(item.quantity) ||
    item.quantity < 1
  ) {
    return null;
  }
  return {
    slug: item.slug,
    variantId: `legacy:${item.slug}`,
    sku: "",
    variantLabel: "Default option",
    name: item.name,
    priceCents: item.priceCents,
    imageUrl: item.imageUrl,
    quantity: item.quantity,
  };
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(CART_STORAGE_KEY);
      const parsed: unknown = stored ? JSON.parse(stored) : [];
      const savedItems = Array.isArray(parsed)
        ? parsed.flatMap((item) => {
            const migrated = migrateStoredCartItem(item);
            return migrated ? [migrated] : [];
          })
        : [];
      startTransition(() => {
        setItems(savedItems);
        setHydrated(true);
      });
    } catch {
      startTransition(() => {
        setItems([]);
        setHydrated(true);
      });
    }
  }, []);

  useEffect(() => {
    if (hydrated) {
      window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    }
  }, [items, hydrated]);

  const addItem = (item: CartProduct, quantity = 1) =>
    setItems((current) => {
      const existing = current.find((entry) => entry.variantId === item.variantId);
      return existing
        ? current.map((entry) =>
            entry.variantId === item.variantId
              ? { ...entry, quantity: entry.quantity + quantity }
              : entry,
          )
        : [...current, { ...item, quantity }];
    });

  const clearCart = useCallback(() => {
    setItems([]);
    window.localStorage.removeItem(CART_STORAGE_KEY);
  }, []);

  const updateQuantity = (variantId: string, quantity: number) => {
    if (quantity < 1) return removeItem(variantId);
    setItems((current) =>
      current.map((item) =>
        item.variantId === variantId ? { ...item, quantity } : item,
      ),
    );
  };

  const removeItem = (variantId: string) => {
    setItems((current) => current.filter((item) => item.variantId !== variantId));
  };

  return (
    <CartContext.Provider
      value={{
        items,
        itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
        addItem,
        updateQuantity,
        removeItem,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used inside CartProvider");
  return context;
}
