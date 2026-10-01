import Link from "next/link";
import { ArrowRight, MessageCircle, Package, PencilRuler, Timer } from "lucide-react";
import { IconFeature } from "@/components/IconFeature";
import { Reveal } from "@/components/Reveal";
import { WholesaleForm } from "@/components/WholesaleForm";

export default function WholesalePage() {
  return (
    <main>
      <section className="bg-ink px-[7vw] py-20 text-paper md:px-[10vw] md:py-28">
        <Reveal className="mx-auto max-w-5xl">
          <p className="text-[.65rem] font-bold uppercase tracking-[.18em] text-lime">
            For the ones who stock the good stuff
          </p>
          <h1 className="my-5 max-w-4xl text-[4rem] font-black uppercase leading-[.88] tracking-[-.07em] md:text-[clamp(4rem,8vw,8rem)]">
            Built for tackle shops
            <br />
            <em className="text-lime not-italic">that sell more fish.</em>
          </h1>
          <p className="max-w-2xl leading-[1.7] text-muted">
            We build custom bait mold designs and hand-finished airbrush paintwork for shops that
            want product with edge. Every run is handmade, designed around your idea, with low MOQ,
            fast delivery, and direct communication from first sketch to final shipment.
          </p>
        </Reveal>
      </section>

      <section className="bg-[#12140f] px-[7vw] py-20 md:px-[10vw] md:py-36">
        <Reveal className="mb-10 md:mb-16">
          <p className="text-[.65rem] font-bold uppercase tracking-[.18em] text-lime">
            Why partner with Calypto
          </p>
          <h2 className="my-[1.3rem] text-[3.5rem] font-black uppercase leading-[.88] tracking-[-.07em] md:text-[clamp(3rem,6vw,6rem)]">
            Built for
            <br />
            <em className="text-lime not-italic">real shop owners.</em>
          </h2>
        </Reveal>
        <Reveal className="grid grid-cols-1 gap-8 border-t border-[rgba(241,240,232,.18)] pt-8 md:grid-cols-4">
          <IconFeature
            icon={PencilRuler}
            title="Custom fit"
            text="Custom bait mold design and airbrush painting built around your customer base."
          />
          <IconFeature
            icon={Package}
            title="Low MOQ"
            text="Start smaller, test faster, and stock the baits your customers actually ask for."
          />
          <IconFeature
            icon={Timer}
            title="Fast turnaround"
            text="Quick production and dependable delivery so you can stay in stock and ahead of demand."
          />
          <IconFeature
            icon={MessageCircle}
            title="Direct contact"
            text="Better communication from the maker, with clear updates and no lost detail."
          />
        </Reveal>
      </section>

      <section
        id="wholesale-inquiry"
        className="bg-paper px-[7vw] py-20 text-ink md:px-[10vw] md:py-28"
      >
        <Reveal className="mx-auto max-w-5xl">
          <p className="text-[.65rem] font-bold uppercase tracking-[.18em] text-lime">
            Wholesale inquiry
          </p>
          <h2 className="my-5 max-w-3xl text-[3.5rem] font-black uppercase leading-[.88] tracking-[-.07em] md:text-[clamp(3rem,6vw,6rem)]">
            Tell us what
            <br />
            <em className="text-lime not-italic">you need.</em>
          </h2>

          <div className="mt-12 grid gap-12 border-t border-[rgba(16,16,14,.18)] pt-8 md:grid-cols-[1fr_1.2fr] md:pt-10">
            <Reveal as="article">
              <p className="mb-5 text-[.65rem] font-bold uppercase tracking-[.15em] text-lime">
                What we can do
              </p>
              <ul className="space-y-3 text-[.9rem] leading-[1.6] text-[#2b2d2a]">
                <li>Custom bait mold design and airbrush paintwork.</li>
                <li>Handmade production for shops that want something unique.</li>
                <li>Low MOQ and fast delivery with clear communication.</li>
              </ul>
              <p className="mt-8 text-[.8rem] font-bold uppercase tracking-[.12em] text-lime">
                <a href="mailto:hello@calypto.co">hello@calypto.co</a>
              </p>
            </Reveal>

            <Reveal
              as="article"
              className="border-t border-[rgba(16,16,14,.18)] pt-6 md:border-l md:border-t-0 md:pl-10 md:pt-0"
            >
              <p className="mb-5 text-[.65rem] font-bold uppercase tracking-[.15em] text-lime">
                Send your details
              </p>
              <WholesaleForm />
            </Reveal>
          </div>
        </Reveal>
      </section>

      <Reveal
        as="section"
        className="bg-[#20261a] px-[7vw] py-24 text-center md:px-[10vw] md:py-32"
      >
        <p className="text-[.65rem] font-bold uppercase tracking-[.18em] text-lime">
          Ready when you are
        </p>
        <h2 className="my-[1.3rem] text-[clamp(3.5rem,8vw,8rem)] font-black uppercase leading-[.88] tracking-[-.07em]">
          Build a better aisle.
          <br />
          <em className="text-lime not-italic">Start with Calypto.</em>
        </h2>
        <div className="flex justify-center">
          <Link
            className="group inline-flex items-center justify-center gap-3 bg-lime px-[1.3rem] py-4 text-[.7rem] font-extrabold uppercase tracking-[.1em] text-ink transition-[transform,background-color,color] duration-300 hover:-translate-y-0.5 active:translate-y-0 motion-reduce:transform-none"
            href="/contact"
          >
            General inquiries{" "}
            <span className="transition-transform duration-300 group-hover:translate-x-1 motion-reduce:transform-none">
              <ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0" strokeWidth={2} />
            </span>
          </Link>
        </div>
      </Reveal>
    </main>
  );
}
