import Image from "next/image";
import Link from "next/link";
import heroImage from "../public/hero-fishing.jpeg";
import { ArrowUpRight, ShieldCheck, Store, Truck, Waves } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { ImageOverlaySection } from "@/components/ImageOverlaySection";
import { ProductCard } from "@/components/ProductCard";
import { IconFeature } from "@/components/IconFeature";
import { Reveal } from "@/components/Reveal";
import { RevealStagger } from "@/components/RevealStagger";

const fallbackProducts = [
  {
    slug: "worm-01",
    name: "Worm Bait Color 01",
    category: "Worm Bait",
    priceCents: 210000,
    imageUrl: "/products/worm/worm-01.jpg",
  },
  {
    slug: "swimbait-01",
    name: "Swimbait Color 01",
    category: "Swimbait",
    priceCents: 270000,
    imageUrl: "/products/swimbait/swimbait-01.jpg",
  },
  {
    slug: "jig-01",
    name: "Jig Color 01",
    category: "Jig",
    priceCents: 180000,
    imageUrl: "/products/jig/jig-01.jpg",
  },
];
export default async function Home() {
  let products = fallbackProducts;
  try {
    products =
      (await prisma.product.findMany({
        take: 3,
        where: { slug: { in: ["worm-01", "swimbait-01", "jig-01"] } },
        orderBy: { createdAt: "asc" },
        select: { slug: true, name: true, category: true, priceCents: true, imageUrl: true },
      })) || fallbackProducts;
  } catch (err) {
    console.error("Failed to load products from DB, using fallback:", err);
  }
  return (
    <main>
      <section className="relative min-h-[680px] overflow-hidden px-[7vw] pb-20 pt-[10vh] md:min-h-[calc(100vh-84px)] md:px-[10vw] md:pb-[8vh] md:pt-[12vh]">
        <Image
          src={heroImage}
          alt="Angler casting at sunrise"
          fill
          priority
          placeholder="blur"
          blurDataURL={heroImage.blurDataURL}
          sizes="100vw"
          className="z-[-2] animate-ken-burns object-cover object-[75%_center] md:object-center motion-reduce:animate-none"
        />
        <div className="absolute inset-0 z-[-1] bg-[linear-gradient(90deg,rgba(13,14,12,.87),rgba(13,14,12,.32))] md:bg-[linear-gradient(90deg,rgba(13,14,12,.94),rgba(13,14,12,.48)_60%,rgba(13,14,12,.15))]" />
        <div className="relative max-w-[700px]">
          <p
            className="animate-hero-rise text-[.65rem] font-bold uppercase tracking-[.18em] text-lime motion-reduce:animate-none"
            style={{ animationDelay: "0ms" }}
          >
            Performance soft plastics / Est. 2026
          </p>
          <h1
            className="animate-hero-rise my-[1.3rem] text-[4rem] font-black uppercase leading-[.88] tracking-[-.07em] md:text-[clamp(3rem,7vw,7.2rem)] motion-reduce:animate-none"
            style={{ animationDelay: "120ms" }}
          >
            Soft baits
            <br />
            <em className="text-lime not-italic">that fish</em>
            <br />
            can&apos;t ignore.
          </h1>
          <p
            className="animate-hero-rise max-w-[390px] leading-[1.6] text-[#d0d2c7] motion-reduce:animate-none"
            style={{ animationDelay: "240ms" }}
          >
            Purpose-built movement. Irresistible profiles. Every cast engineered to create the bite.
          </p>
          <div className="mt-7 grid grid-cols-4">
            {[
              { icon: Waves, title: "Realistic Action", text: "Motion that gets noticed" },
              { icon: ShieldCheck, title: "Durable Plastics", text: "More bites per bait" },
              { icon: Truck, title: "Fast Shipping", text: "Worldwide, always" },
              { icon: Store, title: "Wholesale Ready", text: "Retail & trade pricing" },
            ].map(({ icon, title, text }, index) => (
              <div
                key={title}
                className={`animate-hero-rise flex min-w-0 items-center justify-center motion-reduce:animate-none ${
                  index > 0 ? "pl-1.5 md:pl-4" : ""
                } ${index < 3 ? "border-r border-white/15 pr-1.5 md:pr-4" : ""}`}
                style={{ animationDelay: `${360 + index * 120}ms` }}
              >
                <IconFeature compact icon={icon} title={title} text={text} />
              </div>
            ))}
          </div>
          <div
            className="hero-cta-group animate-hero-rise mt-7 flex flex-wrap gap-3 motion-reduce:animate-none"
            style={{ animationDelay: "840ms" }}
          >
            <Link
              className="hero-cta hero-cta-shop group inline-flex items-center justify-center gap-3 bg-lime px-[1.3rem] py-4 text-[.7rem] font-extrabold uppercase tracking-[.1em] text-ink transition-[transform,background-color,color] duration-300 hover:-translate-y-0.5 active:translate-y-0 motion-reduce:transform-none"
              href="/shop"
            >
              Shop now
              <span className="cta-arrow transition-transform duration-300 group-hover:translate-x-1 motion-reduce:transform-none">
                <ArrowUpRight aria-hidden="true" className="h-4 w-4 shrink-0" strokeWidth={2} />
              </span>
            </Link>
            <a
              className="hero-cta hero-cta-wholesale group inline-flex items-center justify-center gap-3 border border-[rgba(241,240,232,.18)] px-[1.3rem] py-4 text-[.7rem] font-extrabold uppercase tracking-[.1em] transition-colors duration-300 hover:text-lime"
              href="/wholesale"
            >
              Wholesale inquiry
              <span className="cta-arrow transition-transform duration-300 group-hover:translate-x-1 motion-reduce:transform-none">
                <ArrowUpRight aria-hidden="true" className="h-4 w-4 shrink-0" strokeWidth={2} />
              </span>
            </a>
          </div>
        </div>
        <div className="absolute bottom-8 left-[7vw] right-[7vw] flex justify-between text-[.6rem] uppercase tracking-[.14em] text-muted md:left-[10vw] md:right-[10vw]">
          <span>Scroll to explore</span>
          <span>01 / 04</span>
        </div>
      </section>
      <section className="bg-[#12140f] px-[7vw] py-20 md:px-[10vw] md:py-36">
        <Reveal className="mb-10 flex flex-col items-start gap-4 md:mb-16 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[.65rem] font-bold uppercase tracking-[.18em] text-lime">
              The Calypto difference
            </p>
            <h2 className="my-[1.3rem] text-[3.5rem] font-black uppercase leading-[.88] tracking-[-.07em] md:text-[clamp(3rem,6vw,6rem)]">
              Built for the
              <br />
              <em className="text-lime not-italic">moment of truth.</em>
            </h2>
          </div>
          <p className="max-w-[290px] leading-[1.6] text-muted">
            Every shape, color, and action is refined for the instant a curious fish becomes a
            committed strike.
          </p>
        </Reveal>
        <RevealStagger className="grid grid-cols-1 gap-8 border-t border-[rgba(241,240,232,.18)] pt-8 md:grid-cols-3">
          <IconFeature
            label="01"
            title="Dialed-in profiles"
            text="Natural silhouettes that make fish look twice."
          />
          <IconFeature
            label="02"
            title="Proven action"
            text="Subtle vibration and kick at every retrieve speed."
          />
          <IconFeature
            label="03"
            title="Tough by design"
            text="Soft enough to fool them. Tough enough to last."
          />
        </RevealStagger>
      </section>
      <section className="bg-paper px-[7vw] py-20 text-ink md:px-[10vw] md:py-36" id="shop">
        <Reveal className="mb-10 flex flex-col items-start gap-4 md:mb-16 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[.65rem] font-bold uppercase tracking-[.18em] text-lime">
              The lineup
            </p>
            <h2 className="my-[1.3rem] text-[3.5rem] font-black uppercase leading-[.88] tracking-[-.07em] md:text-[clamp(3rem,6vw,6rem)]">
              Our best-selling
              <br />
              <em className="text-lime not-italic">soft baits.</em>
            </h2>
          </div>
          <Link
            className="group link-underline inline-flex items-center gap-1.5 pb-1 text-[.7rem] font-extrabold uppercase tracking-[.12em] text-lime"
            href="/shop"
          >
            View all baits{" "}
            <span className="transition-transform duration-300 group-hover:translate-x-1 motion-reduce:transform-none">
              <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
            </span>
          </Link>
        </Reveal>
        <RevealStagger className="grid grid-cols-2 gap-2 md:grid-cols-3 md:gap-3 lg:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.slug} product={product} />
          ))}
        </RevealStagger>
      </section>
      <ImageOverlaySection
        eyebrow="Made with intent"
        headingLines={[
          { text: "Less guesswork.", color: "white" },
          { text: "More water time.", color: "lime" },
        ]}
        paragraphs={[
          "We started Calypto because the best days on the water come from confidence. Confidence in your gear. Confidence in your presentation. Confidence that the next cast could be the one.",
        ]}
        cta={{ label: "Our Story", href: "/about" }}
      />
      <Reveal as="section" className="bg-lime px-[7vw] py-20 text-ink md:px-[10vw] md:py-24">
        <p className="text-[.65rem] font-bold uppercase tracking-[.18em] text-[#526213]">
          For the ones who stock the good stuff
        </p>
        <h2 className="my-4 text-[clamp(3rem,7vw,7rem)] font-black uppercase leading-[.88] tracking-[-.07em]">
          Own a tackle shop?
        </h2>
        <p className="mb-8">
          Custom bait mold design and airbrush painting, all handmade. Share your idea and
          we&apos;ll build it. Low MOQ, fast delivery, best quality on the market, and better
          communication from start to finish.
        </p>
        <Link
          className="button-primary group inline-flex items-center justify-center gap-3 px-[1.3rem] py-4 text-[.7rem] tracking-[.1em] text-paper transition-[transform,background-color,color] duration-300 hover:-translate-y-0.5 active:translate-y-0 motion-reduce:transform-none"
          href="/wholesale"
        >
          Partner with us{" "}
          <span className="transition-transform duration-300 group-hover:translate-x-1 motion-reduce:transform-none">
            <ArrowUpRight aria-hidden="true" className="h-4 w-4 shrink-0" strokeWidth={2} />
          </span>
        </Link>
      </Reveal>
      <Reveal as="section" className="px-[7vw] py-24 text-center md:px-[10vw] md:py-36">
        <p className="text-[.65rem] font-bold uppercase tracking-[.18em] text-lime">
          From the water
        </p>
        <blockquote className="mx-auto my-8 max-w-[950px] text-[2.3rem] font-extrabold leading-[.98] tracking-[-.05em] md:text-[clamp(2rem,4vw,4rem)]">
          “The action is subtle enough for clear water, but it still gets noticed. Calypto has
          earned a permanent spot in my box.”
        </blockquote>
        <cite className="text-[.7rem] uppercase tracking-[.1em] text-muted not-italic">
          — Marcus R. / Tournament angler
        </cite>
      </Reveal>
      <Reveal
        as="section"
        className="bg-[#20261a] px-[7vw] py-24 text-center md:px-[10vw] md:py-32"
      >
        <p className="text-[.65rem] font-bold uppercase tracking-[.18em] text-lime">
          Your next personal best
        </p>
        <h2 className="my-[1.3rem] text-[clamp(3.5rem,8vw,8rem)] font-black uppercase leading-[.88] tracking-[-.07em]">
          Make the next cast
          <br />
          <em className="text-lime not-italic">count.</em>
        </h2>
        <Link
          className="group inline-flex items-center justify-center gap-3 bg-lime px-[1.3rem] py-4 text-[.7rem] font-extrabold uppercase tracking-[.1em] text-ink transition-[transform,background-color,color] duration-300 hover:-translate-y-0.5 active:translate-y-0 motion-reduce:transform-none"
          href="/shop"
        >
          Shop Calypto{" "}
          <span className="transition-transform duration-300 group-hover:translate-x-1 motion-reduce:transform-none">
            <ArrowUpRight aria-hidden="true" className="h-4 w-4 shrink-0" strokeWidth={2} />
          </span>
        </Link>
      </Reveal>
    </main>
  );
}
