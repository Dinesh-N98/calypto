"use client";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useCart } from "./CartProvider";
const links = [
  ["Shop", "/shop"],
  ["About Us", "/about"],
  ["Contact", "/contact"],
];
export function Header() {
  const [open, setOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const { itemCount } = useCart();
  const { data: session, status } = useSession();
  const isSignedIn = status === "authenticated";
  const accountLabel = session?.user?.name || session?.user?.email || "Account";

  useEffect(() => {
    if (!accountMenuOpen) return;

    const closeAccountMenu = (event: MouseEvent) => {
      if (event.target instanceof Element && !event.target.closest("[data-account-menu]")) {
        setAccountMenuOpen(false);
      }
    };

    document.addEventListener("click", closeAccountMenu);
    return () => document.removeEventListener("click", closeAccountMenu);
  }, [accountMenuOpen]);

  return (
    <header className="sticky top-0 z-50 flex h-[72px] items-center justify-between bg-ink px-[6vw] md:h-[84px] md:px-[5vw]">
      <Link className="text-[1.4rem] font-black tracking-[.14em]" href="/">
        calypto<span className="align-top text-[.5em] text-lime">®</span>
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
      <div className="flex items-center gap-2 md:gap-6 md:border-l md:border-[rgba(241,240,232,.18)] md:pl-6">
        {isSignedIn ? (
          <div className="relative hidden md:block" data-account-menu>
            <button
              className="grid h-7 w-7 place-items-center rounded-full border-0 bg-lime p-0 text-[.65rem] text-ink"
              onClick={() => setAccountMenuOpen((isOpen) => !isOpen)}
              title={accountLabel}
              aria-expanded={accountMenuOpen}
              aria-label={`Open account menu for ${accountLabel}`}
            >
                {accountLabel.charAt(0).toUpperCase()}
            </button>
            {accountMenuOpen && (
              <div className="absolute right-0 top-10 z-20 min-w-32 border border-[rgba(241,240,232,.18)] bg-ink p-3">
                <Link
                  className="block text-[.68rem] font-bold uppercase tracking-[.12em] text-muted hover:text-lime"
                  href="/account"
                  onClick={() => setAccountMenuOpen(false)}
                >
                  Account
                </Link>
                <button
                  className="mt-3 block border-0 bg-transparent p-0 text-[.68rem] font-bold uppercase tracking-[.12em] text-muted hover:text-lime"
                  onClick={() => signOut({ callbackUrl: "/" })}
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>
        ) : (
          <Link
            className="hidden text-[.72rem] font-bold uppercase tracking-[.12em] text-muted hover:text-lime md:block"
            href="/sign-in"
          >
            Sign In
          </Link>
        )}
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
          <div className="relative md:hidden" data-account-menu>
            <button
              className="grid h-12 w-12 place-items-center rounded-full border-0 bg-transparent p-3 text-ink"
              onClick={() => setAccountMenuOpen((isOpen) => !isOpen)}
              title={accountLabel}
              aria-expanded={accountMenuOpen}
              aria-label={`Open account menu for ${accountLabel}`}
            >
              <span className="grid h-7 w-7 place-items-center rounded-full bg-lime text-[.65rem]">
                {accountLabel.charAt(0).toUpperCase()}
              </span>
            </button>
            {accountMenuOpen && (
              <div className="absolute right-0 top-12 z-20 min-w-32 border border-[rgba(241,240,232,.18)] bg-ink p-3">
                <Link
                  className="block text-[.68rem] font-bold uppercase tracking-[.12em] text-muted hover:text-lime"
                  href="/account"
                  onClick={() => setAccountMenuOpen(false)}
                >
                  Account
                </Link>
                <button
                  className="mt-3 block border-0 bg-transparent p-0 text-[.68rem] font-bold uppercase tracking-[.12em] text-muted hover:text-lime"
                  onClick={() => signOut({ callbackUrl: "/" })}
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>
        ) : (
          <Link
            className="flex min-h-12 items-center border border-[rgba(241,240,232,.25)] px-3 py-2 text-[.65rem] font-bold uppercase tracking-[.1em] text-paper hover:text-lime md:hidden"
            href="/sign-in"
          >
            Sign In
          </Link>
        )}
        <button
          className="block border-0 bg-transparent text-[1.5rem] text-paper md:hidden"
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
