import Link from "next/link";
import { categories } from "@/lib/categories";

export function Footer() {
  return (
    <footer className="grid grid-cols-2 gap-12 bg-[#080908] px-[7vw] pb-8 pt-16 md:grid-cols-[2fr_repeat(3,1fr)] md:px-[10vw] md:pb-8 md:pt-20">
      <div className="col-span-full flex flex-col gap-3 md:col-span-1">
        <Link className="text-[1.4rem] font-black tracking-[.14em]" href="/">
          calypto<span className="align-top text-[.5em] text-lime">®</span>
        </Link>
        <p>Soft plastics for serious water.</p>
      </div>
      <div className="flex flex-col gap-3">
        <h3 className="text-[.65rem] uppercase tracking-[.16em] text-lime">Shop</h3>
        <Link className="text-[.75rem] text-muted" href="/shop">
          All baits
        </Link>
        {categories.map((category) => (
          <Link
            className="text-[.75rem] text-muted"
            href={`/shop?category=${category.slug}`}
            key={category.slug}
          >
            {category.displayName}
          </Link>
        ))}
      </div>
      <div className="flex flex-col gap-3">
        <h3 className="text-[.65rem] uppercase tracking-[.16em] text-lime">Company</h3>
        <Link className="text-[.75rem] text-muted" href="/about">
          Our story
        </Link>
        <Link className="text-[.75rem] text-muted" href="/wholesale">
          Wholesale
        </Link>
        <Link className="text-[.75rem] text-muted" href="/contact">
          Contact
        </Link>
      </div>
      <div className="flex flex-col gap-3">
        <h3 className="text-[.65rem] uppercase tracking-[.16em] text-lime">Follow us</h3>
        <a className="text-[.75rem] text-muted" href="#instagram">
          Instagram ↗
        </a>
        <a className="text-[.75rem] text-muted" href="#youtube">
          YouTube ↗
        </a>
        <a className="text-[.75rem] text-muted" href="#email">
          hello@calypto.co
        </a>
      </div>
      <small className="col-span-full pt-8 text-[.75rem] text-muted">
        © 2026 Calypto. Built for the bite.
      </small>
    </footer>
  );
}
