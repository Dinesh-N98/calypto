import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductDetailExperience } from "@/components/ProductDetailExperience";
import { prisma } from "@/lib/prisma";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await prisma.product.findUnique({
    where: { slug },
    include: {
      category: {
        select: { name: true, tieredDiscountsEnabled: true },
      },
      images: { orderBy: { order: "asc" }, take: 1 },
    },
  });

  if (!product) notFound();

  const title = `${product.name} - ${product.category.name}`;
  const description = `${product.description} Explore ${product.category.name} soft baits from calypto.`;
  const imageUrl = product.images[0]?.url ?? product.imageUrl;

  return {
    title,
    description,
    openGraph: {
      type: "website",
      title,
      description,
      images: [{ url: imageUrl, alt: product.name }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
  };
}

export default async function ProductDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await prisma.product.findUnique({
    where: { slug },
    include: {
      category: {
        select: { name: true, tieredDiscountsEnabled: true },
      },
      images: { orderBy: { order: "asc" }, select: { id: true, url: true, altText: true } },
      variants: {
        orderBy: [{ color: "asc" }, { size: "asc" }],
        select: {
          id: true,
          sku: true,
          priceCents: true,
          discountPriceCents: true,
          stock: true,
          size: true,
          color: true,
          imageUrl: true,
        },
      },
      tieredDiscounts: {
        orderBy: { minQuantity: "asc" },
        select: { minQuantity: true, discountPercentage: true },
      },
    },
  });

  if (!product) notFound();

  const reviews = await prisma.review.aggregate({
    where: { productId: product.id },
    _avg: { rating: true },
    _count: { rating: true },
  });

  return (
    <main className="bg-paper px-[6vw] py-8 text-ink md:px-[8vw] md:py-12">
      <div className="site-container">
        <ProductDetailExperience
          averageRating={reviews._avg.rating ?? 0}
          categoryName={product.category.name}
          images={product.images}
          product={{
            id: product.id,
            slug: product.slug,
            name: product.name,
            description: product.description,
            brand: product.brand,
            imageUrl: product.imageUrl,
            priceCents: product.priceCents,
            salePriceCents: product.salePriceCents,
            originalPriceCents: product.originalPriceCents,
            saleEndsAt: product.saleEndsAt,
            tieredDiscountsEnabled:
              product.tieredDiscountsEnabled ?? product.category.tieredDiscountsEnabled,
          }}
          reviewCount={reviews._count.rating}
          tieredDiscounts={product.tieredDiscounts}
          variants={product.variants}
        />
      </div>
    </main>
  );
}
