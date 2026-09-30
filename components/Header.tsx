"use client";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { useCart } from "./CartProvider";
const links = [
  ["Home", "/"],
  ["Shop", "/shop"],
  ["About Us", "/about"],
  ["Wholesale", "/wholesale"],
  ["Contact", "/contact"],
];
export function Header() {
  const [open, setOpen] = useState(false);
  const { itemCount } = useCart();
  const { data: session, status } = useSession();
  const isSignedIn = status === "authenticated";
  const accountLabel = session?.user?.name || session?.user?.email || "Account";

  return (
    <header className="sticky top-0 z-50 flex h-[72px] items-center justify-between bg-ink px-[6vw] md:grid md:grid-cols-[1fr_auto_1fr] md:h-[84px] md:px-[5vw]">
      <Link className="justify-self-start text-[1.4rem] font-black tracking-[.14em]" href="/">
        calypto<span className="align-top text-[.5em] text-lime">™</span>
      </Link>
      <nav className="hidden items-center justify-center gap-8 md:flex">
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
      <div className="flex items-center justify-self-end gap-3 md:gap-6 md:border-l md:border-[rgba(241,240,232,.18)] md:pl-6">
        <Link
          className="relative inline-flex min-h-12 min-w-12 items-center justify-center p-3 text-muted transition-colors hover:text-lime"
          href="/cart"
          aria-label={`Cart, ${itemCount} item${itemCount === 1 ? "" : "s"}`}
        >
          <svg
            className="h-[22px] w-[22px]"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M6 8h12l1 13H5L6 8Z" />
            <path d="M9 8a3 3 0 0 1 6 0" />
          </svg>
          <b className="absolute right-1 top-1 inline-grid h-[19px] w-[19px] place-items-center rounded-full bg-lime text-[.6rem] text-ink">
            {itemCount}
          </b>
        </Link>
        {isSignedIn ? (
          <Link
            className="hidden h-7 w-7 place-items-center rounded-full bg-lime text-[.65rem] font-bold text-ink md:grid"
            href="/account"
            title={accountLabel}
            aria-label={`Go to account, ${accountLabel}`}
          >
            {accountLabel.charAt(0).toUpperCase()}
          </Link>
        ) : (
          <Link
            className="hidden h-12 w-12 items-center justify-center rounded-full text-muted transition-colors hover:text-lime focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime md:inline-flex"
            href="/sign-in"
            aria-label="Sign in"
          >
            <svg
              className="h-6 w-6"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="8" r="4" />
              <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
            </svg>
          </Link>
        )}
        {isSignedIn && (
          <Link
            className="grid h-12 w-12 place-items-center rounded-full md:hidden"
            href="/account"
            title={accountLabel}
            aria-label={`Go to account, ${accountLabel}`}
          >
            <span className="grid h-6 w-6 place-items-center rounded-full bg-lime text-[.65rem] text-ink">
              {accountLabel.charAt(0).toUpperCase()}
            </span>
          </Link>
        )}
        {!isSignedIn && (
          <Link
            className="grid h-12 w-12 place-items-center rounded-full text-paper md:hidden"
            href="/sign-in"
            aria-label="Sign in"
          >
            <svg
              className="h-6 w-6"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="8" r="4" />
              <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
            </svg>
          </Link>
        )}
        <button
          className="inline-flex min-h-12 min-w-12 items-center justify-center border-0 bg-transparent p-3 text-[1.5rem] text-paper md:hidden"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
        >
          ☰
        </button>
      </div>
      {open && (
        <div className="fixed inset-0 z-[60] flex flex-col overflow-y-auto bg-ink px-[10vw] pb-8 pt-[8rem]">
          <button
            className="absolute right-[8vw] top-6 grid h-12 w-12 place-items-center border-0 bg-transparent p-0 text-[2rem] text-paper"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
          >
            ×
          </button>
          <span className="text-[.65rem] font-bold uppercase tracking-[.18em] text-lime">
            CAST WITH INTENT
          </span>
          <nav className="mt-6 flex flex-col">
            {links.map(([label, href]) => (
              <Link
                className="flex min-h-12 items-center border-b border-[rgba(241,240,232,.18)] py-4 text-[2rem] font-black uppercase tracking-[-.04em]"
                key={href}
                href={href}
                onClick={() => setOpen(false)}
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
