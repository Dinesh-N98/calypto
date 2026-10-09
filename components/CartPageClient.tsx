"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { useState } from "react";
import { useCart } from "@/components/CartProvider";
import { CheckoutForm, type CheckoutAddress } from "@/components/CheckoutForm";
import { Reveal } from "@/components/Reveal";
import { QuantitySelector } from "@/components/QuantitySelector";
import { formatPrice } from "@/lib/currency";
import { productImageBlurDataURL } from "@/lib/productImagePlaceholder";

export default function CartPageClient({
  savedAddresses,
  defaultAddress,
  isAuthenticated,
  buyNowVariantId,
  buyNowQuantity,
}: {
  savedAddresses: CheckoutAddress[];
  defaultAddress: CheckoutAddress | null;
  isAuthenticated: boolean;
  buyNowVariantId?: string;
  buyNowQuantity: number;
}) {
  const { items, updateQuantity, removeItem } = useCart();
  const [directPurchaseQuantity, setDirectPurchaseQuantity] = useState(buyNowQuantity);
  const purchaseItems = buyNowVariantId
    ? items.flatMap((item) =>
        item.variantId === buyNowVariantId
          ? [{ ...item, quantity: directPurchaseQuantity }]
          : [],
      )
    : items;
  const totalCents = purchaseItems.reduce(
    (total, item) => total + item.priceCents * item.quantity,
    0,
  );

  return (
    <main className="bg-paper px-[7vw] py-12 text-ink md:px-[10vw] md:py-20">
      <Reveal as="section" className="mx-auto max-w-5xl">
        <p className="text-[.6rem] font-bold uppercase tracking-[.15em] text-[#65771b]">
          Your cart
        </p>
        <h1 className="my-4 text-[clamp(2.65rem,9vw,3.8rem)] font-black uppercase leading-[.92] tracking-[-.07em] md:my-5 md:text-[clamp(3.5rem,6vw,6rem)]">
          Ready to
          <br />
          <em className="text-[#829b22] not-italic">cast.</em>
        </h1>
        {purchaseItems.length === 0 ? (
          <div className="border-t border-[rgba(13,14,12,.18)] pt-8">
            <h2 className="text-2xl font-black uppercase tracking-[-.04em] md:text-3xl">
              Your cart is empty.
            </h2>
            <Link
              className="button-primary mt-8 inline-flex items-center justify-center gap-3 px-5 py-4 text-[.7rem] tracking-[.1em] text-paper"
              href="/shop"
            >
              Browse the lineup{" "}
              <ArrowUpRight aria-hidden="true" className="h-4 w-4 shrink-0" strokeWidth={2} />
            </Link>
          </div>
        ) : (
          <div className="grid gap-10 border-t border-[rgba(13,14,12,.18)] pt-8 md:grid-cols-[1fr_18rem]">
            <div className="grid gap-4">
              {purchaseItems.map((item) => (
                <div
                  className="flex gap-4 border-b border-[rgba(13,14,12,.14)] pb-4"
                  key={item.variantId}
                >
                  <div className="relative h-24 w-24 shrink-0 bg-[#e4e4d9]">
                    <Image
                      src={item.imageUrl}
                      alt={item.name}
                      fill
                      loading="lazy"
                      placeholder="blur"
                      blurDataURL={productImageBlurDataURL}
                      sizes="96px"
                      className="object-contain"
                    />
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col justify-between gap-3 sm:flex-row sm:items-center">
                    <div>
                      <h2 className="font-bold uppercase">{item.name}</h2>
                      {item.variantLabel && (
                        <p className="mt-1 text-xs text-[#55584e]">
                          {item.variantLabel}
                          {item.sku ? ` · SKU ${item.sku}` : ""}
                        </p>
                      )}
                      <p className="mt-1 text-sm text-[#55584e]">
                        {formatPrice(item.priceCents)} each
                      </p>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <QuantitySelector
                        value={item.quantity}
                        onChange={(quantity) => {
                          if (buyNowVariantId === item.variantId) {
                            setDirectPurchaseQuantity(quantity);
                          }
                          updateQuantity(item.variantId, quantity);
                        }}
                      />
                      <button
                        className="text-[.65rem] font-bold uppercase tracking-[.1em] text-[#65771b]"
                        onClick={() => removeItem(item.variantId)}
                        type="button"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <aside className="border-t border-ink pt-5 md:border-t-0 md:border-l md:pl-6">
              <p className="text-[.65rem] font-bold uppercase tracking-[.15em] text-[#65771b]">
                Total
              </p>
              <p className="mt-3 text-2xl font-black md:text-3xl">{formatPrice(totalCents)}</p>
              <CheckoutForm
                defaultAddress={defaultAddress}
                isAuthenticated={isAuthenticated}
                items={purchaseItems.map(({ variantId, quantity }) => ({ variantId, quantity }))}
                savedAddresses={savedAddresses}
              />
            </aside>
          </div>
        )}
      </Reveal>
    </main>
  );
}
