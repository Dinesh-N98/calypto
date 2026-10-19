// Mission/values copy is placeholder — needs client review before launch.
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ImageOverlaySection } from "@/components/ImageOverlaySection";
import { Reveal } from "@/components/Reveal";

export default function AboutPage() {
  return (
    <main>
      <ImageOverlaySection
        headingLines={[
          { text: "About", color: "white" },
          { text: "Calypto", color: "lime" },
        ]}
        paragraphs={[
          "Calypto is a fishing bait manufacturer focused on producing premium soft plastic baits for anglers and tackle shops worldwide.",
          "From realistic worms to high-action swimbaits, every bait is designed with one goal:",
        ]}
        emphasizedLine="Catch more fish."
        compact
      />
      <section className="px-[7vw] py-16 text-center md:px-[10vw] md:py-28">
        <Reveal className="site-container">
          <p className="text-[.6rem] font-bold uppercase tracking-[.15em] text-lime">Our Mission</p>
          <p className="mx-auto my-6 max-w-[950px] text-[1.65rem] font-extrabold leading-[1.08] tracking-[-.04em] md:my-8 md:text-[clamp(1.8rem,3.5vw,3.5rem)]">
            We believe every angler deserves gear that performs as hard as they do. Soft plastics
            engineered with intent, tested on the water, built to earn a permanent spot in your box.
          </p>
        </Reveal>
      </section>
      <Reveal
        as="section"
        className="bg-[#20261a] px-[7vw] py-16 text-center md:px-[10vw] md:py-24"
      >
        <div className="site-container">
          <p className="text-[.6rem] font-bold uppercase tracking-[.15em] text-lime">
            Your next personal best
          </p>
          <h2 className="my-4 text-[clamp(2.5rem,8vw,4rem)] font-black uppercase leading-[.92] tracking-[-.07em] md:my-[1.3rem] md:text-[clamp(3.5rem,6vw,6rem)]">
            Make the next cast
            <br />
            <em className="text-lime not-italic">count.</em>
          </h2>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              className="group inline-flex items-center justify-center gap-3 bg-lime px-[1.3rem] py-4 text-[.7rem] font-extrabold uppercase tracking-[.1em] text-ink transition-[transform,background-color,color] duration-300 hover:-translate-y-0.5 active:translate-y-0 motion-reduce:transform-none"
              href="/shop"
            >
              Shop the lineup{" "}
              <span className="transition-transform duration-300 group-hover:translate-x-1 motion-reduce:transform-none">
                <ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0" strokeWidth={2} />
              </span>
            </Link>
            <Link
              className="group inline-flex items-center justify-center gap-3 border border-[rgba(241,240,232,.18)] px-[1.3rem] py-4 text-[.7rem] font-extrabold uppercase tracking-[.1em] text-paper transition-colors duration-300 hover:text-lime"
              href="/contact"
            >
              Get in touch{" "}
              <span className="transition-transform duration-300 group-hover:translate-x-1 motion-reduce:transform-none">
                <ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0" strokeWidth={2} />
              </span>
            </Link>
          </div>
        </div>
      </Reveal>
    </main>
  );
}
