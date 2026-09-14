"use client";
import Link from "next/link";
import { useState } from "react";
import { useCart } from "./CartProvider";
const links = [
  ["Shop", "/shop"],
  ["About Us", "/about"],
  ["Wholesale", "/wholesale"],
  ["Contact", "/contact"],
];
export function Header() {
  const [open, setOpen] = useState(false);
  const { itemCount } = useCart();
  return (
    <header className="relative z-[5] flex h-[72px] items-center justify-between bg-ink px-[6vw] md:h-[84px] md:px-[5vw]">
      <Link className="text-[1.4rem] font-black tracking-[.14em]" href="/">
        CALYPTO<span className="align-top text-[.5em] text-lime">®</span>
      </Link>
      <nav className="ml-auto mr-12 hidden gap-8 md:flex">
        {links.map(([label, href]) => (
          <Link
            className="text-[.72rem] font-bold uppercase tracking-[.12em] text-muted hover:text-lime"
            key={href}
            href={href}
          >
            {label}
          </Link>
        ))}
      </nav>
      <div className="flex items-center gap-6">
        <Link
          className="text-[.72rem] font-bold uppercase tracking-[.12em] text-muted"
          href="/cart"
        >
          Cart{" "}
          <b className="ml-1 inline-grid h-[19px] w-[19px] place-items-center rounded-full bg-lime text-[.6rem] text-ink">
            {itemCount}
          </b>
        </Link>
        <button
          className="block border-0 bg-transparent text-[1.5rem] text-paper md:hidden"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
        >
          ☰
        </button>
      </div>
      {open && (
        <div className="fixed inset-0 z-10 flex flex-col bg-ink px-[10vw] pt-[8rem]">
          <button
            className="absolute right-[8vw] top-8 border-0 bg-transparent text-[2rem] text-paper"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
          >
            ×
          </button>
          <span className="text-[.65rem] font-bold uppercase tracking-[.18em] text-lime">
            CAST WITH INTENT
          </span>
          {links.map(([label, href]) => (
            <Link
              className="border-b border-[rgba(241,240,232,.18)] py-4 text-[2rem] font-black uppercase tracking-[-.04em]"
              key={href}
              href={href}
              onClick={() => setOpen(false)}
            >
              {label}
            </Link>
          ))}
          <Link href="/cart" onClick={() => setOpen(false)}>
            Cart ({itemCount})
          </Link>
        </div>
      )}
    </header>
  );
}
