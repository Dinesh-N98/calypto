import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { ProductCard } from "@/components/ProductCard";
import { IconFeature } from "@/components/IconFeature";

const fallbackProducts = ["Green Pumpkin Worm", "Olive Flake Tube", "Shad Runner"].map(
  (name, index) => ({
    slug: name.toLowerCase().replace(/\s+/g, "-"),
    name,
    category: ["Real Worm Bait", "Tube Bait", "Swimbait"][index],
    priceCents: 699 + index * 100,
    imageUrl: "/bait-detail.jpeg",
  }),
);
export default async function Home() {
  let products = fallbackProducts;
  try {
    products =
      (await prisma.product.findMany({
        take: 3,
        orderBy: { createdAt: "asc" },
        select: { slug: true, name: true, category: true, priceCents: true, imageUrl: true },
      })) || fallbackProducts;
  } catch (err) {
    console.error("Failed to load products from DB, using fallback:", err);
  }
  return (
    <main>
      <section className="hero">
        <Image
          src="/hero-fishing.jpeg"
          alt="Angler casting at sunrise"
          fill
          priority
          sizes="100vw"
          className="hero-image"
        />
        <div className="hero-overlay" />
        <div className="hero-content">
          <p className="eyebrow">Performance soft plastics / Est. 2026</p>
          <h1>
            Soft baits
            <br />
            <em>that fish</em>
            <br />
            can&apos;t ignore.
          </h1>
          <p className="hero-copy">
            Purpose-built movement. Irresistible profiles. Every cast engineered to create the bite.
          </p>
          <div className="button-row">
            <a className="button button-accent" href="#shop">
              Shop now <span>↗</span>
            </a>
            <a className="button button-outline" href="/wholesale">
              Wholesale inquiry <span>↗</span>
            </a>
          </div>
        </div>
        <div className="hero-foot">
          <span>Scroll to explore</span>
          <span>01 / 04</span>
        </div>
      </section>
      <section className="trust-row">
        <IconFeature icon="◈" title="Realistic action" text="Motion that gets noticed" />
        <IconFeature icon="◇" title="Durable plastics" text="More bites per bait" />
        <IconFeature icon="↗" title="Fast shipping" text="Worldwide, always" />
        <IconFeature icon="＋" title="Wholesale ready" text="Retail & trade pricing" />
      </section>
      <section className="section dark-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">The Calypto difference</p>
            <h2>
              Built for the
              <br />
              <em>moment of truth.</em>
            </h2>
          </div>
          <p>
            Every shape, color, and action is refined for the instant a curious fish becomes a
            committed strike.
          </p>
        </div>
        <div className="feature-grid">
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
      <section className="section product-section" id="shop">
        <div className="section-heading">
          <div>
            <p className="eyebrow">The lineup</p>
            <h2>
              Our best-selling
              <br />
              <em>soft baits.</em>
            </h2>
          </div>
          <a className="text-link" href="/shop">
            View all baits ↗
          </a>
        </div>
        <div className="product-grid">
          {products.map((product) => (
            <ProductCard key={product.slug} product={product} />
          ))}
        </div>
      </section>
      <section className="split-section">
        <div className="split-image">
          <Image src="/bait-detail.jpeg" alt="Calypto soft bait detail" fill sizes="50vw" />
        </div>
        <div className="split-copy">
          <p className="eyebrow">Made with intent</p>
          <h2>
            Less guesswork.
            <br />
            <em>More water time.</em>
          </h2>
          <p>
            We started Calypto because the best days on the water come from confidence. Confidence
            in your gear. Confidence in your presentation. Confidence that the next cast could be
            the one.
          </p>
          <a className="text-link" href="/about">
            Our story ↗
          </a>
        </div>
      </section>
      <section className="wholesale-banner">
        <p className="eyebrow">For the ones who stock the good stuff</p>
        <h2>Own a tackle shop?</h2>
        <p>Put proven soft plastics in your customers&apos; hands.</p>
        <a className="button button-accent" href="/wholesale">
          Partner with us <span>↗</span>
        </a>
      </section>
      <section className="quotes">
        <p className="eyebrow">From the water</p>
        <blockquote>
          “The action is subtle enough for clear water, but it still gets noticed. Calypto has
          earned a permanent spot in my box.”
        </blockquote>
        <cite>— Marcus R. / Tournament angler</cite>
      </section>
      <section className="final-cta">
        <p className="eyebrow">Your next personal best</p>
        <h2>
          Make the next cast
          <br />
          <em>count.</em>
        </h2>
        <a className="button button-accent" href="/shop">
          Shop Calypto <span>↗</span>
        </a>
      </section>
    </main>
  );
}
