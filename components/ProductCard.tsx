import Image from "next/image";
import Link from "next/link";
export function ProductCard({
  product,
}: {
  product: { slug: string; name: string; category: string; priceCents: number; imageUrl: string };
}) {
  return (
    <Link className="product-card" href={`/shop/${product.slug}`}>
      <div className="product-image">
        <Image
          src={product.imageUrl}
          alt={product.name}
          fill
          sizes="(max-width: 700px) 90vw, 30vw"
        />
      </div>
      <div className="product-meta">
        <span>{product.category}</span>
        <strong>{product.name}</strong>
        <b>${(product.priceCents / 100).toFixed(2)}</b>
      </div>
    </Link>
  );
}
