import Image from "next/image";
import { notFound } from "next/navigation";
import { productImageBlurDataURL } from "@/lib/productImagePlaceholder";
import { Reveal } from "@/components/Reveal";
import { ProductPurchase } from "@/components/ProductPurchase";
import { formatPrice } from "@/lib/currency";
import { prisma } from "@/lib/prisma";

export default async function ProductDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await prisma.product.findUnique({ where: { slug } });

  if (!product) notFound();

  return (
    <main className="bg-paper px-[7vw] py-12 text-ink md:px-[10vw] md:py-20">
      <div className="site-container grid gap-8 md:grid-cols-2 md:items-center md:gap-14">
        <Reveal className="relative aspect-[1/1.1] overflow-hidden bg-[#e4e4d9]">
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            loading="lazy"
            placeholder="blur"
            blurDataURL={productImageBlurDataURL}
            sizes="(max-width: 767px) 86vw, 40vw"
            className="object-contain"
          />
        </Reveal>
        <Reveal className="max-w-xl" delay={100}>
          <p className="text-[.6rem] font-bold uppercase tracking-[.15em] text-[#697b26]">
            {product.category}
          </p>
          <h1 className="my-4 text-[clamp(2.35rem,8vw,3.2rem)] font-black uppercase leading-[.94] tracking-[-.06em] text-ink md:my-5 md:text-[clamp(3rem,5vw,5rem)]">
            {product.name}
          </h1>
          <p className="text-xl font-bold text-ink md:text-2xl">
            {formatPrice(product.priceCents)}
          </p>
          <p className="my-6 max-w-lg text-[.9rem] leading-[1.6] text-[#697064] md:my-8 md:text-base md:leading-[1.7]">
            {product.description}
          </p>
          <ProductPurchase
            prominent
            product={{
              slug: product.slug,
              name: product.name,
              priceCents: product.priceCents,
              imageUrl: product.imageUrl,
            }}
          />
        </Reveal>
      </div>
    </main>
  );
}
