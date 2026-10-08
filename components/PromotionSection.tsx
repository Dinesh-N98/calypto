import Image from "next/image";
import Link from "next/link";
import type { Promotion } from "@prisma/client";

export function PromotionSection({ promotions }: { promotions: Promotion[] }) {
  if (promotions.length === 0) return null;

  return (
    <section
      aria-label="Current promotions"
      className="bg-[#171a14] px-[7vw] py-12 md:px-[10vw] md:py-16"
    >
      <div className="site-container">
        <p className="mb-5 text-[.6rem] font-bold uppercase tracking-[.15em] text-lime">
          Limited-time offers
        </p>
        <div className="grid gap-4 lg:grid-cols-2">
          {promotions.map((promotion) => (
            <article
              className="relative isolate flex min-h-64 items-end overflow-hidden rounded-lg bg-[#262b20] p-6 text-white md:min-h-72 md:p-8"
              key={promotion.id}
            >
              <Image
                alt=""
                className="absolute inset-0 -z-20 object-cover"
                fill
                sizes="(min-width: 1024px) 50vw, 100vw"
                src={promotion.imageUrl}
                unoptimized
              />
              <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black/90 via-black/45 to-black/10" />
              <div className="max-w-xl">
                <p className="text-[.65rem] font-bold uppercase tracking-[.14em] text-lime">
                  {promotion.discountPercent
                    ? `${promotion.discountPercent}% off`
                    : "A Calypto special"}
                </p>
                <h2 className="mt-2 text-2xl font-black uppercase leading-tight tracking-[-.04em] md:text-3xl">
                  {promotion.title}
                </h2>
                <p className="mt-2 max-w-lg text-sm leading-6 text-white/80">
                  {promotion.description}
                </p>
                <div className="mt-5 flex flex-wrap items-center gap-4">
                  {promotion.discountCode && (
                    <p className="rounded border border-white/40 bg-black/20 px-3 py-2 text-xs font-bold uppercase tracking-[.1em]">
                      Code: {promotion.discountCode}
                    </p>
                  )}
                  <Link
                    className="inline-flex min-h-10 items-center rounded-md bg-lime px-4 text-xs font-extrabold uppercase tracking-[.08em] text-[#171a14] transition-colors hover:bg-white"
                    href="/shop"
                  >
                    Shop now
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
