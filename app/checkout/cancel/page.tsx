import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Reveal } from "@/components/Reveal";

export default function CheckoutCancelPage() {
  return (
    <main className="bg-paper px-[7vw] py-16 text-ink md:px-[10vw] md:py-20">
      <Reveal as="section" className="mx-auto max-w-3xl border-t border-ink pt-8">
        <p className="text-[.6rem] font-bold uppercase tracking-[.15em] text-[#65771b]">
          Checkout cancelled
        </p>
        <h1 className="my-4 text-[clamp(2.65rem,9vw,3.8rem)] font-black uppercase leading-[.92] tracking-[-.07em] md:my-5 md:text-[clamp(3.5rem,6vw,6rem)]">
          Still
          <br />
          <em className="text-[#829b22] not-italic">hooked.</em>
        </h1>
        <p className="max-w-lg leading-[1.7] text-[#55584e]">
          Your payment was cancelled, and your cart is still here.
        </p>
        <Link
          className="button-primary mt-8 inline-flex items-center justify-center gap-3 px-5 py-4 text-[.7rem] tracking-[.1em] text-paper"
          href="/cart"
        >
          Return to cart{" "}
          <ArrowUpRight aria-hidden="true" className="h-4 w-4 shrink-0" strokeWidth={2} />
        </Link>
      </Reveal>
    </main>
  );
}
