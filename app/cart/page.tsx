"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useCart } from "@/components/CartProvider";
import { QuantitySelector } from "@/components/QuantitySelector";
import { formatPrice } from "@/lib/currency";

export default function CartPage() {
  const { items, updateQuantity, removeItem } = useCart();
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const totalCents = items.reduce((total, item) => total + item.priceCents * item.quantity, 0);

  async function checkout() {
    setIsCheckingOut(true);
    setError(null);
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: items.map(({ slug, quantity }) => ({ slug, quantity })) }),
      });
      const result = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !result.url) throw new Error(result.error || "Unable to start checkout.");
      window.location.href = result.url;
    } catch (checkoutError) {
      setError(checkoutError instanceof Error ? checkoutError.message : "Unable to start checkout.");
      setIsCheckingOut(false);
    }
  }

  return (
    <main className="bg-paper px-[7vw] py-16 text-ink md:px-[10vw] md:py-24">
      <section className="mx-auto max-w-5xl">
        <p className="text-[.65rem] font-bold uppercase tracking-[.18em] text-[#65771b]">Your cart</p>
        <h1 className="my-5 text-[4rem] font-black uppercase leading-[.88] tracking-[-.07em] md:text-[clamp(4rem,8vw,8rem)]">Ready to<br /><em className="text-[#829b22] not-italic">cast.</em></h1>
        {items.length === 0 ? (
          <div className="border-t border-[rgba(13,14,12,.18)] pt-8">
            <h2 className="text-3xl font-black uppercase tracking-[-.04em]">Your cart is empty.</h2>
            <Link className="mt-8 inline-flex bg-ink px-5 py-4 text-[.7rem] font-extrabold uppercase tracking-[.1em] text-paper" href="/shop">Browse the lineup ↗</Link>
          </div>
        ) : (
          <div className="grid gap-10 border-t border-[rgba(13,14,12,.18)] pt-8 md:grid-cols-[1fr_18rem]">
            <div className="grid gap-4">
              {items.map((item) => (
                <div className="flex gap-4 border-b border-[rgba(13,14,12,.14)] pb-4" key={item.slug}>
                  <div className="relative h-24 w-24 shrink-0 bg-[#e4e4d9]"><Image src={item.imageUrl} alt={item.name} fill sizes="96px" className="object-contain" /></div>
                  <div className="flex min-w-0 flex-1 flex-col justify-between gap-3 sm:flex-row sm:items-center">
                    <div><h2 className="font-bold uppercase">{item.name}</h2><p className="mt-1 text-sm text-[#55584e]">{formatPrice(item.priceCents)} each</p></div>
                    <div className="flex items-center justify-between gap-4"><QuantitySelector value={item.quantity} onChange={(quantity) => updateQuantity(item.slug, quantity)} /><button className="text-[.65rem] font-bold uppercase tracking-[.1em] text-[#65771b]" onClick={() => removeItem(item.slug)} type="button">Remove</button></div>
                  </div>
                </div>
              ))}
            </div>
            <aside className="border-t border-ink pt-5 md:border-t-0 md:border-l md:pl-6"><p className="text-[.65rem] font-bold uppercase tracking-[.15em] text-[#65771b]">Total</p><p className="mt-3 text-3xl font-black">{formatPrice(totalCents)}</p><button className="mt-6 w-full bg-ink px-5 py-4 text-[.7rem] font-extrabold uppercase tracking-[.1em] text-paper" disabled={isCheckingOut} onClick={checkout} type="button">{isCheckingOut ? "Opening checkout..." : "Checkout ↗"}</button>{error && <p className="mt-4 text-sm text-red-700">{error}</p>}</aside>
          </div>
        )}
      </section>
    </main>
  );
}