import Link from "next/link";
import { auth } from "@/auth";
import { ProductCard } from "@/components/ProductCard";
import { prisma } from "@/lib/prisma";

export default async function AccountWishlistPage() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;

  const items = await prisma.wishlistItem.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      product: {
        select: {
          id: true,
          slug: true,
          name: true,
          priceCents: true,
          imageUrl: true,
        },
      },
    },
  });

  return (
    <section aria-labelledby="account-wishlist-title">
      <p className="text-[.65rem] font-bold uppercase tracking-[.15em] text-primary">
        Your account
      </p>
      <h1
        className="mb-3 mt-3 break-words text-2xl font-black uppercase tracking-[-.06em] sm:text-4xl lg:text-5xl"
        id="account-wishlist-title"
      >
        Wishlist
      </h1>
      <p className="mb-7 text-sm leading-6 text-muted-foreground">
        Products you have saved for another day.
      </p>
      {items.length > 0 ? (
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3 md:gap-3">
          {items.map(({ product }) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="border-y border-border py-10 text-center">
          <p className="font-semibold text-foreground">Your wishlist is empty.</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Save products with the heart button while you browse.
          </p>
          <Link
            className="mt-5 inline-flex min-h-11 items-center justify-center bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            href="/shop"
          >
            Explore products
          </Link>
        </div>
      )}
    </section>
  );
}
