import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ImageOverlaySection } from "@/components/ImageOverlaySection";
import { ProductCard } from "@/components/ProductCard";
import { IconFeature } from "@/components/IconFeature";

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
          src="/hero-fishing.jpeg"
          alt="Angler casting at sunrise"
          fill
          priority
          sizes="100vw"
          className="z-[-2] object-cover object-[75%_center] md:object-center"
        />
        <div className="absolute inset-0 z-[-1] bg-[linear-gradient(90deg,rgba(13,14,12,.87),rgba(13,14,12,.32))] md:bg-[linear-gradient(90deg,rgba(13,14,12,.94),rgba(13,14,12,.48)_60%,rgba(13,14,12,.15))]" />
        <div className="relative max-w-[700px]">
          <p className="text-[.65rem] font-bold uppercase tracking-[.18em] text-lime">
            Performance soft plastics / Est. 2026
          </p>
          <h1 className="my-[1.3rem] text-[4rem] font-black uppercase leading-[.88] tracking-[-.07em] md:text-[clamp(3rem,7vw,7.2rem)]">
            Soft baits
            <br />
            <em className="text-lime not-italic">that fish</em>
            <br />
            can&apos;t ignore.
          </h1>
          <p className="max-w-[390px] leading-[1.6] text-[#d0d2c7]">
            Purpose-built movement. Irresistible profiles. Every cast engineered to create the bite.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              className="inline-flex items-center gap-6 bg-lime px-[1.3rem] py-4 text-[.7rem] font-extrabold uppercase tracking-[.1em] text-ink"
              href="#shop"
            >
              Shop now <span>↗</span>
            </a>
            <a
              className="inline-flex items-center gap-6 border border-[rgba(241,240,232,.18)] px-[1.3rem] py-4 text-[.7rem] font-extrabold uppercase tracking-[.1em]"
              href="/wholesale"
            >
              Wholesale inquiry <span>↗</span>
            </a>
          </div>
        </div>
        <div className="absolute bottom-8 left-[7vw] right-[7vw] flex justify-between text-[.6rem] uppercase tracking-[.14em] text-muted md:left-[10vw] md:right-[10vw]">
          <span>Scroll to explore</span>
          <span>01 / 04</span>
        </div>
      </section>
      <section className="grid grid-cols-1 gap-7 bg-[#171914] px-[7vw] py-10 md:grid-cols-4 md:gap-4 md:py-10">
        <IconFeature icon="◈" title="Realistic action" text="Motion that gets noticed" />
        <IconFeature icon="◇" title="Durable plastics" text="More bites per bait" />
        <IconFeature icon="↗" title="Fast shipping" text="Worldwide, always" />
        <IconFeature icon="＋" title="Wholesale ready" text="Retail & trade pricing" />
      </section>
      <section className="bg-[#12140f] px-[7vw] py-20 md:px-[10vw] md:py-36">
        <div className="mb-10 flex flex-col items-start gap-4 md:mb-16 md:flex-row md:items-end md:justify-between">
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
        </div>
        <div className="grid grid-cols-1 gap-8 border-t border-[rgba(241,240,232,.18)] pt-8 md:grid-cols-3">
          <IconFeature
            icon="01"
            title="Dialed-in profiles"
            text="Natural silhouettes that make fish look twice."
          />
          <IconFeature
            icon="02"
            title="Proven action"
            text="Subtle vibration and kick at every retrieve speed."
          />
          <IconFeature
            icon="03"
            title="Tough by design"
            text="Soft enough to fool them. Tough enough to last."
          />
        </div>
      </section>
      <section className="bg-paper px-[7vw] py-20 text-ink md:px-[10vw] md:py-36" id="shop">
        <div className="mb-10 flex flex-col items-start gap-4 md:mb-16 md:flex-row md:items-end md:justify-between">
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
            className="border-b border-lime pb-1 text-[.7rem] font-extrabold uppercase tracking-[.12em] text-lime"
            href="/shop"
          >
            View all baits ↗
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {products.map((product) => (
            <ProductCard key={product.slug} product={product} />
          ))}
        </div>
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
      <section className="bg-lime px-[7vw] py-20 text-ink md:px-[10vw] md:py-24">
        <p className="text-[.65rem] font-bold uppercase tracking-[.18em] text-[#526213]">
          For the ones who stock the good stuff
        </p>
        <h2 className="my-4 text-[clamp(3rem,7vw,7rem)] font-black uppercase leading-[.88] tracking-[-.07em]">
          Own a tackle shop?
        </h2>
        <p className="mb-8">Put proven soft plastics in your customers&apos; hands.</p>
        <Link
          className="inline-flex items-center gap-6 bg-ink px-[1.3rem] py-4 text-[.7rem] font-extrabold uppercase tracking-[.1em] text-paper"
          href="/wholesale"
        >
          Partner with us <span>↗</span>
        </Link>
      </section>
      <section className="px-[7vw] py-24 text-center md:px-[10vw] md:py-36">
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
        <Link
          className="inline-flex items-center gap-6 bg-lime px-[1.3rem] py-4 text-[.7rem] font-extrabold uppercase tracking-[.1em] text-ink"
          href="/shop"
        >
          Shop Calypto <span>↗</span>
        </Link>
      </section>
    </main>
  );
}
