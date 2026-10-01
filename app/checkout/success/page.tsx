"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useCart } from "@/components/CartProvider";
import { Reveal } from "@/components/Reveal";

function SuccessDetails() {
  const searchParams = useSearchParams();
  const { clearCart } = useCart();
  const sessionId = searchParams.get("session_id");

  useEffect(() => {
    clearCart();
  }, [clearCart]);

  return (
    <Reveal as="section" className="mx-auto max-w-3xl border-t border-ink pt-8">
      <p className="text-[.6rem] font-bold uppercase tracking-[.15em] text-[#65771b]">
        Payment confirmed
      </p>
      <h1 className="my-4 text-[clamp(2.65rem,9vw,3.8rem)] font-black uppercase leading-[.92] tracking-[-.07em] md:my-5 md:text-[clamp(3.5rem,6vw,6rem)]">
        Order
        <br />
        <em className="text-[#829b22] not-italic">locked.</em>
      </h1>
      <p className="max-w-lg leading-[1.7] text-[#55584e]">
        Thanks for fishing with Calypto. Your order is being prepared now.
      </p>
      {sessionId && <p className="mt-5 text-xs text-[#55584e]">Confirmation: {sessionId}</p>}
      <Link
        className="button-primary mt-8 inline-flex items-center justify-center gap-3 px-5 py-4 text-[.7rem] tracking-[.1em] text-paper"
        href="/shop"
      >
        Keep fishing{" "}
        <ArrowUpRight aria-hidden="true" className="h-4 w-4 shrink-0" strokeWidth={2} />
      </Link>
    </Reveal>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <main className="bg-paper px-[7vw] py-16 text-ink md:px-[10vw] md:py-20">
      <Suspense>
        <SuccessDetails />
      </Suspense>
    </main>
  );
}
