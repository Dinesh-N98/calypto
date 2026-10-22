import Image from "next/image";
import Link from "next/link";
import heroImage from "../../public/hero-fishing.jpeg";
import { ArrowUpRight, ShieldCheck, Store, Truck, Waves } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { IconFeature } from "@/components/IconFeature";
import { Reveal } from "@/components/Reveal";
import { PromotionSection } from "@/components/PromotionSection";
import { CategoryCarousel } from "@/components/CategoryCarousel";

export default async function Home() {
  const now = new Date();
  const [promotions, categories] = await Promise.all([
    prisma.promotion.findMany({
      where: {
        isActive: true,
        AND: [
          { OR: [{ startDate: null }, { startDate: { lte: now } }] },
          { OR: [{ endDate: null }, { endDate: { gte: now } }] },
        ],
      },
      orderBy: [{ startDate: "asc" }, { createdAt: "desc" }],
    }),
    prisma.category.findMany({
      orderBy: { name: "asc" },
      select: {
        name: true,
        slug: true,
        image: true,
        products: {
          take: 1,
          orderBy: { createdAt: "asc" },
          select: { imageUrl: true },
        },
      },
    }),
  ]);

  return (
    <main>
      <section className="relative min-h-0 overflow-hidden px-4 py-8 md:min-h-[calc(100vh-84px)] md:px-[10vw] md:pb-[8vh] md:pt-[12vh]">
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
        <div className="site-container">
          <div className="relative max-w-[700px]">
            <p
              className="animate-hero-rise text-[.6rem] font-bold uppercase tracking-[.15em] text-lime motion-reduce:animate-none"
              style={{ animationDelay: "0ms" }}
            >
              Performance soft plastics / Est. 2026
            </p>
            <h1
              className="animate-hero-rise my-4 text-[clamp(2.35rem,8.8vw,3.4rem)] font-black uppercase leading-[.92] tracking-[-.07em] md:my-[1.3rem] md:text-[clamp(3.5rem,6.5vw,6.5rem)] motion-reduce:animate-none"
              style={{ animationDelay: "120ms" }}
            >
              Soft baits
              <br />
              <em className="text-lime not-italic">that fish</em>
              <br />
              can&apos;t ignore.
            </h1>
            <p
              className="animate-hero-rise max-w-[390px] text-[.9rem] leading-[1.5] text-[#d0d2c7] md:text-base motion-reduce:animate-none"
              style={{ animationDelay: "240ms" }}
            >
              Purpose-built movement. Irresistible profiles. Every cast engineered to create the
              bite.
            </p>
            <div className="mt-5 grid grid-cols-4 md:mt-7">
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
              className="hero-cta-group animate-hero-rise mb-16 mt-5 flex w-full flex-col gap-3 motion-reduce:animate-none md:mb-0 md:mt-7 md:w-auto md:flex-row md:gap-4"
              style={{ animationDelay: "840ms" }}
            >
              <Link
                className="hero-cta hero-cta-shop group inline-flex w-full items-center justify-center gap-3 whitespace-nowrap rounded-lg bg-[#829B22] px-6 py-3.5 text-sm font-bold uppercase tracking-wider text-white transition-colors duration-200 ease-in-out hover:bg-[#a3e635] hover:text-black md:w-auto"
                href="/shop"
              >
                <span className="text-white transition-colors duration-200 group-hover:text-black">
                  Shop now
                </span>
                <span className="cta-arrow transition-transform duration-300 group-hover:translate-x-1 motion-reduce:transform-none">
                  <ArrowUpRight
                    aria-hidden="true"
                    className="h-4 w-4 shrink-0 text-white transition-colors duration-200 group-hover:text-black"
                    strokeWidth={2}
                  />
                </span>
              </Link>
              <a
                className="hero-cta hero-cta-wholesale group inline-flex w-full items-center justify-center gap-3 whitespace-nowrap rounded-lg border border-white/20 bg-white/10 px-6 py-3.5 text-sm font-bold uppercase tracking-wider text-white backdrop-blur-md transition-colors duration-200 ease-in-out hover:bg-white/20 md:w-auto"
                href="/wholesale"
              >
                Wholesale inquiry
                <span className="cta-arrow transition-transform duration-300 group-hover:translate-x-1 motion-reduce:transform-none">
                  <ArrowUpRight aria-hidden="true" className="h-4 w-4 shrink-0" strokeWidth={2} />
                </span>
              </a>
            </div>
          </div>
        </div>
        <div className="site-container relative mt-10 flex justify-between text-[.6rem] uppercase tracking-[.14em] text-muted md:absolute md:bottom-20 md:left-[10vw] md:right-[10vw] md:mt-0">
          <span>Scroll to explore</span>
          <span>01 / 04</span>
        </div>
      </section>
      <PromotionSection promotions={promotions} />
      <CategoryCarousel
        categories={categories.map((category) => ({
          name: category.name,
          slug: category.slug,
          image: category.image ?? category.products[0]?.imageUrl ?? null,
        }))}
      />
      <Reveal as="section" className="bg-lime px-[7vw] py-14 text-ink md:px-[10vw] md:py-20">
        <div className="site-container">
          <p className="text-[.6rem] font-bold uppercase tracking-[.15em] text-[#526213]">
            For the ones who stock the good stuff
          </p>
          <h2 className="my-4 text-[clamp(2.5rem,8vw,4rem)] font-black uppercase leading-[.92] tracking-[-.07em] md:text-[clamp(3.5rem,6vw,6rem)]">
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
        </div>
      </Reveal>
      <Reveal
        as="section"
        className="site-container px-[7vw] py-16 text-center md:px-[10vw] md:py-28"
      >
        <p className="text-[.6rem] font-bold uppercase tracking-[.15em] text-lime">
          From the water
        </p>
        <blockquote className="mx-auto my-6 max-w-[950px] text-[1.65rem] font-extrabold leading-[1.08] tracking-[-.04em] md:my-8 md:text-[clamp(1.8rem,3.5vw,3.5rem)]">
          “The action is subtle enough for clear water, but it still gets noticed. Calypto has
          earned a permanent spot in my box.”
        </blockquote>
        <cite className="text-[.7rem] uppercase tracking-[.1em] text-muted not-italic">
          — Marcus R. / Tournament angler
        </cite>
      </Reveal>
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
          <Link
            className="group inline-flex items-center justify-center gap-3 bg-lime px-[1.3rem] py-4 text-[.7rem] font-extrabold uppercase tracking-[.1em] text-ink transition-[transform,background-color,color] duration-300 hover:-translate-y-0.5 active:translate-y-0 motion-reduce:transform-none"
            href="/shop"
          >
            Shop Calypto{" "}
            <span className="transition-transform duration-300 group-hover:translate-x-1 motion-reduce:transform-none">
              <ArrowUpRight aria-hidden="true" className="h-4 w-4 shrink-0" strokeWidth={2} />
            </span>
          </Link>
        </div>
      </Reveal>
    </main>
  );
}
