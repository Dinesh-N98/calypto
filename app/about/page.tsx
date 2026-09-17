// Mission/values copy is placeholder — needs client review before launch.
import Link from "next/link";
import { IconFeature } from "@/components/IconFeature";
import { ImageOverlaySection } from "@/components/ImageOverlaySection";

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
      />
      <section className="px-[7vw] py-24 text-center md:px-[10vw] md:py-36">
        <p className="text-[.65rem] font-bold uppercase tracking-[.18em] text-lime">Our Mission</p>
        <p className="mx-auto my-8 max-w-[950px] text-[2.3rem] font-extrabold leading-[.98] tracking-[-.05em] md:text-[clamp(2rem,4vw,4rem)]">
          We believe every angler deserves gear that performs as hard as they do — soft plastics
          engineered with intent, tested on the water, built to earn a permanent spot in your box.
        </p>
      </section>
      <section className="bg-[#12140f] px-[7vw] py-20 md:px-[10vw] md:py-36">
        <div className="mb-10 md:mb-16">
          <h2 className="my-[1.3rem] text-[3.5rem] font-black uppercase leading-[.88] tracking-[-.07em] md:text-[clamp(3rem,6vw,6rem)]">
            What We
            <br />
            <em className="text-lime not-italic">Stand For.</em>
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-8 border-t border-[rgba(241,240,232,.18)] pt-8 md:grid-cols-3">
          <IconFeature
            icon="◈"
            title="Quality Materials"
            text="Every bait starts with premium soft plastic and consistent color runs."
          />
          <IconFeature
            icon="◇"
            title="Field-Tested Action"
            text="Profiles and movement refined through real time on the water, not just in the lab."
          />
          <IconFeature
            icon="↗"
            title="Built for Anglers"
            text="From weekend casts to tournament day, gear that holds up to how it's actually used."
          />
        </div>
      </section>
      <section className="bg-[#20261a] px-[7vw] py-24 text-center md:px-[10vw] md:py-32">
        <p className="text-[.65rem] font-bold uppercase tracking-[.18em] text-lime">
          Your next personal best
        </p>
        <h2 className="my-[1.3rem] text-[clamp(3.5rem,8vw,8rem)] font-black uppercase leading-[.88] tracking-[-.07em]">
          Make the next cast
          <br />
          <em className="text-lime not-italic">count.</em>
        </h2>
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            className="inline-flex items-center gap-6 bg-lime px-[1.3rem] py-4 text-[.7rem] font-extrabold uppercase tracking-[.1em] text-ink"
            href="/shop"
          >
            Shop the lineup <span>→</span>
          </Link>
          <Link
            className="inline-flex items-center gap-6 border border-[rgba(241,240,232,.18)] px-[1.3rem] py-4 text-[.7rem] font-extrabold uppercase tracking-[.1em] text-paper"
            href="/contact"
          >
            Get in touch <span>→</span>
          </Link>
        </div>
      </section>
    </main>
  );
}