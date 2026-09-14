import Image from "next/image";
import { notFound } from "next/navigation";
import { ProductPurchase } from "@/components/ProductPurchase";
import { prisma } from "@/lib/prisma";

export default async function ProductDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await prisma.product.findUnique({ where: { slug } });

  if (!product) notFound();

  return (
    <main className="bg-paper px-[7vw] py-16 text-ink md:px-[10vw] md:py-24">
      <div className="grid gap-10 md:grid-cols-2 md:items-center md:gap-16">
        <div className="relative aspect-[1/1.1] overflow-hidden bg-[#e4e4d9]">
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            priority
            sizes="(max-width: 767px) 86vw, 50vw"
            className="object-contain"
          />
        </div>
        <div className="max-w-xl">
          <p className="text-[.65rem] font-bold uppercase tracking-[.18em] text-[#697b26]">
            {product.category}
          </p>
          <h1 className="my-5 text-[3.3rem] font-black uppercase leading-[.9] tracking-[-.06em] md:text-[clamp(3.5rem,6vw,6rem)]">
            {product.name}
          </h1>
          <p className="text-2xl font-bold">${(product.priceCents / 100).toFixed(2)}</p>
          <p className="my-8 max-w-lg leading-[1.7] text-[#697064]">{product.description}</p>
          <ProductPurchase
            prominent
            product={{
              slug: product.slug,
              name: product.name,
              priceCents: product.priceCents,
              imageUrl: product.imageUrl,
            }}
          />
        </div>
      </div>
    </main>
  );
}
