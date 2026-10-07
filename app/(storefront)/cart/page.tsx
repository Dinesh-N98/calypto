"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { FormEvent, useCallback, useState } from "react";
import { useCart } from "@/components/CartProvider";
import {
  useCustomerProfileAutofill,
  type CustomerProfile,
} from "@/components/CustomerProfileProvider";
import { Reveal } from "@/components/Reveal";
import { QuantitySelector } from "@/components/QuantitySelector";
import { formatPrice } from "@/lib/currency";
import { productImageBlurDataURL } from "@/lib/productImagePlaceholder";

export default function CartPage() {
  const { items, updateQuantity, removeItem } = useCart();
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const resolveCustomerFields = useCallback(
    (profile: CustomerProfile) => ({
      firstName: profile.firstName,
      lastName: profile.lastName,
      email: profile.email,
      phone: profile.phone,
    }),
    [],
  );
  const {
    formRef,
    onChange,
    status: profileStatus,
  } = useCustomerProfileAutofill(resolveCustomerFields);
  const totalCents = items.reduce((total, item) => total + item.priceCents * item.quantity, 0);

  async function checkout(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsCheckingOut(true);
    setError(null);
    try {
      const formData = new FormData(event.currentTarget);
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map(({ slug, quantity }) => ({ slug, quantity })),
          customer: {
            firstName: formData.get("firstName"),
            lastName: formData.get("lastName"),
            email: formData.get("email"),
            phone: formData.get("phone"),
          },
        }),
      });
      const result = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !result.url) throw new Error(result.error || "Unable to start checkout.");
      window.location.href = result.url;
    } catch (checkoutError) {
      setError(
        checkoutError instanceof Error ? checkoutError.message : "Unable to start checkout.",
      );
      setIsCheckingOut(false);
    }
  }

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
        {items.length === 0 ? (
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
              {items.map((item) => (
                <div
                  className="flex gap-4 border-b border-[rgba(13,14,12,.14)] pb-4"
                  key={item.slug}
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
                      <p className="mt-1 text-sm text-[#55584e]">
                        {formatPrice(item.priceCents)} each
                      </p>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <QuantitySelector
                        value={item.quantity}
                        onChange={(quantity) => updateQuantity(item.slug, quantity)}
                      />
                      <button
                        className="text-[.65rem] font-bold uppercase tracking-[.1em] text-[#65771b]"
                        onClick={() => removeItem(item.slug)}
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
              <form
                className="mt-6 grid gap-4"
                onChange={onChange}
                onSubmit={checkout}
                ref={formRef}
              >
                <p className="text-sm leading-[1.6] text-[#55584e]">
                  OnePay requires your name, email, and phone number to create the payment.
                </p>
                {profileStatus === "error" && (
                  <p className="text-sm text-muted" role="status">
                    Saved details could not be loaded. You can still enter your details manually.
                  </p>
                )}
                <label className="grid gap-2 text-[.65rem] font-bold uppercase tracking-[.1em]">
                  First name
                  <input
                    autoComplete="given-name"
                    className="auth-input"
                    maxLength={100}
                    name="firstName"
                    required
                  />
                </label>
                <label className="grid gap-2 text-[.65rem] font-bold uppercase tracking-[.1em]">
                  Last name
                  <input
                    autoComplete="family-name"
                    className="auth-input"
                    maxLength={100}
                    name="lastName"
                    required
                  />
                </label>
                <label className="grid gap-2 text-[.65rem] font-bold uppercase tracking-[.1em]">
                  Email
                  <input
                    autoComplete="email"
                    className="auth-input"
                    maxLength={254}
                    name="email"
                    required
                    type="email"
                  />
                </label>
                <label className="grid gap-2 text-[.65rem] font-bold uppercase tracking-[.1em]">
                  Phone number (E.164, e.g. +94771234567)
                  <input
                    autoComplete="tel"
                    className="auth-input"
                    name="phone"
                    pattern="\+[1-9][0-9]{7,14}"
                    placeholder="+94771234567"
                    required
                    type="tel"
                  />
                </label>
                <button
                  className="button-primary inline-flex w-full items-center justify-center gap-3 px-5 py-4 text-[.7rem] tracking-[.1em] text-paper"
                  disabled={isCheckingOut}
                  type="submit"
                >
                  {isCheckingOut ? (
                    "Opening checkout..."
                  ) : (
                    <>
                      Checkout{" "}
                      <ArrowUpRight
                        aria-hidden="true"
                        className="h-4 w-4 shrink-0"
                        strokeWidth={2}
                      />
                    </>
                  )}
                </button>
              </form>
              {error && <p className="mt-4 text-sm text-red-700">{error}</p>}
            </aside>
          </div>
        )}
      </Reveal>
    </main>
  );
}
