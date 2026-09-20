import Link from "next/link";

export default function CheckoutCancelPage() {
  return <main className="bg-paper px-[7vw] py-24 text-ink md:px-[10vw]"><section className="mx-auto max-w-3xl border-t border-ink pt-8"><p className="text-[.65rem] font-bold uppercase tracking-[.18em] text-[#65771b]">Checkout cancelled</p><h1 className="my-5 text-[4rem] font-black uppercase leading-[.88] tracking-[-.07em] md:text-[clamp(4rem,8vw,8rem)]">Still<br /><em className="text-[#829b22] not-italic">hooked.</em></h1><p className="max-w-lg leading-[1.7] text-[#55584e]">Your payment was cancelled, and your cart is still here.</p><Link className="button-primary mt-8 inline-flex px-5 py-4 text-[.7rem] tracking-[.1em] text-paper" href="/cart">Return to cart ↗</Link></section></main>;
}