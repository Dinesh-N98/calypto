"use client";

export const GA_READY_EVENT = "calypto-ga-ready";

const purchaseStorageKey = "calypto-ga4-purchases";
const maxStoredTransactions = 100;
const firedTransactions = new Set<string>();

export type GaEcommerceItemInput = {
  itemId: string;
  itemName: string;
  itemCategory?: string | null;
  itemVariant?: string | null;
  itemListName?: string | null;
  priceCents: number;
  quantity: number;
};

export type GaPurchaseInput = {
  status: string;
  transactionId: string;
  currency: string;
  items: GaEcommerceItemInput[];
};

type GaEcommerceItem = {
  item_id: string;
  item_name: string;
  item_category?: string;
  item_variant?: string;
  item_list_name?: string;
  price: number;
  quantity: number;
};

type Gtag = (...args: unknown[]) => void;

declare global {
  interface Window {
    gtag?: Gtag;
  }
}

export function toMajorUnits(cents: number): number {
  return Number((cents / 100).toFixed(2));
}

function mapItems(items: GaEcommerceItemInput[]): GaEcommerceItem[] {
  return items.map((item) => ({
    item_id: item.itemId,
    item_name: item.itemName,
    ...(item.itemCategory ? { item_category: item.itemCategory } : {}),
    ...(item.itemVariant ? { item_variant: item.itemVariant } : {}),
    ...(item.itemListName ? { item_list_name: item.itemListName } : {}),
    price: toMajorUnits(item.priceCents),
    quantity: item.quantity,
  }));
}

function eventValue(items: GaEcommerceItem[]): number {
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  return Number(total.toFixed(2));
}

function sendEvent(
  eventName: "view_item" | "add_to_cart" | "begin_checkout" | "purchase",
  params: Record<string, unknown>,
): boolean {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return false;
  window.gtag("event", eventName, params);
  return true;
}

export function trackViewItem(item: GaEcommerceItemInput, currency: string): boolean {
  const items = mapItems([item]);
  return sendEvent("view_item", {
    currency,
    value: eventValue(items),
    items,
  });
}

export function trackAddToCart(item: GaEcommerceItemInput, currency: string): boolean {
  const items = mapItems([item]);
  return sendEvent("add_to_cart", {
    currency,
    value: eventValue(items),
    items,
  });
}

export function trackBeginCheckout(
  items: GaEcommerceItemInput[],
  currency: string,
): boolean {
  const gaItems = mapItems(items);
  return sendEvent("begin_checkout", {
    currency,
    value: eventValue(gaItems),
    items: gaItems,
  });
}

function readStoredTransactions(): string[] {
  try {
    const stored = window.localStorage.getItem(purchaseStorageKey);
    if (!stored) return [];
    const parsed: unknown = JSON.parse(stored);
    return Array.isArray(parsed)
      ? parsed.filter((transactionId): transactionId is string => typeof transactionId === "string")
      : [];
  } catch {
    // Storage can be disabled or unavailable; the in-memory set still prevents repeat sends.
    return [];
  }
}

function rememberTransaction(transactionId: string): void {
  firedTransactions.add(transactionId);
  try {
    const transactions = readStoredTransactions().filter((id) => id !== transactionId);
    transactions.push(transactionId);
    window.localStorage.setItem(
      purchaseStorageKey,
      JSON.stringify(transactions.slice(-maxStoredTransactions)),
    );
  } catch {
    // Storage can be disabled or unavailable; the in-memory set still prevents repeat sends.
  }
}

export function trackPurchase(order: GaPurchaseInput): boolean {
  if (
    order.status !== "paid" ||
    !order.transactionId ||
    !order.currency ||
    order.items.length === 0 ||
    typeof window === "undefined" ||
    typeof window.gtag !== "function"
  ) {
    return false;
  }

  if (firedTransactions.has(order.transactionId)) return false;
  if (readStoredTransactions().includes(order.transactionId)) {
    firedTransactions.add(order.transactionId);
    return false;
  }

  const items = mapItems(order.items);
  rememberTransaction(order.transactionId);
  return sendEvent("purchase", {
    transaction_id: order.transactionId,
    currency: order.currency,
    value: eventValue(items),
    items,
  });
}
