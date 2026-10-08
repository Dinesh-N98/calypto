"use client";
import Link from "next/link";
import { Menu, ShoppingBag, UserRound, X } from "lucide-react";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useCart } from "./CartProvider";
const links = [
  ["Home", "/"],
  ["Shop", "/shop"],
  ["About Us", "/about"],
  ["Contact", "/contact"],
];
export function Header() {
  const [open, setOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const { itemCount } = useCart();
  const { data: session, status } = useSession();
  const isSignedIn = status === "authenticated";
  const accountLabel = session?.user?.name || session?.user?.email || "Account";

  useEffect(() => {
    let animationFrame = 0;

    const updateScrollState = () => {
      if (animationFrame) return;
      animationFrame = window.requestAnimationFrame(() => {
        setIsScrolled(window.scrollY > 24);
        animationFrame = 0;
      });
    };

    updateScrollState();
    window.addEventListener("scroll", updateScrollState, { passive: true });
    return () => {
      window.removeEventListener("scroll", updateScrollState);
      window.cancelAnimationFrame(animationFrame);
    };
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 h-16 border-b bg-ink transition-[height,border-color] duration-300 ${isScrolled ? "border-[rgba(241,240,232,.18)] md:h-[68px]" : "border-transparent md:h-[84px]"}`}
    >
      <div className="site-container flex h-full items-center justify-between px-[6vw] md:grid md:grid-cols-[1fr_auto_1fr] md:px-[5vw]">
        <Link
          className="justify-self-start text-[1.25rem] font-black tracking-[.12em] md:text-[1.35rem]"
          href="/"
        >
          calypto<span className="align-top text-[.5em] text-lime">™</span>
        </Link>
        <nav className="hidden items-center justify-center gap-6 md:flex">
          {links.map(([label, href]) => (
            <Link
              className="link-underline text-[.68rem] font-bold uppercase tracking-[.1em] text-muted transition-colors hover:text-lime"
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
            <ShoppingBag aria-hidden="true" className="h-5 w-5" strokeWidth={2} />
            <b
              key={itemCount}
              className="animate-badge-pop absolute right-1 top-1 inline-grid h-[19px] w-[19px] place-items-center rounded-full bg-lime text-[.6rem] text-ink motion-reduce:animate-none"
            >
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
              <UserRound aria-hidden="true" className="h-5 w-5" strokeWidth={2} />
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
              <UserRound aria-hidden="true" className="h-5 w-5" strokeWidth={2} />
            </Link>
          )}
          <button
            className="inline-flex min-h-12 min-w-12 items-center justify-center border-0 bg-transparent p-3 text-paper md:hidden"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
          >
            <Menu aria-hidden="true" className="h-5 w-5" strokeWidth={2} />
          </button>
        </div>
      </div>
      {open && (
        <div className="fixed inset-0 z-[60] flex animate-fade-in flex-col overflow-y-auto bg-ink px-[10vw] pb-8 pt-[8rem] motion-reduce:animate-none">
          <button
            className="absolute right-[8vw] top-6 grid h-12 w-12 place-items-center border-0 bg-transparent p-0 text-paper"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
          >
            <X aria-hidden="true" className="h-6 w-6" strokeWidth={2} />
          </button>
          <span className="text-[.6rem] font-bold uppercase tracking-[.15em] text-lime">
            CAST WITH INTENT
          </span>
          <nav className="mt-6 flex flex-col">
            {links.map(([label, href], index) => (
              <Link
                className="animate-hero-rise flex min-h-12 items-center border-b border-[rgba(241,240,232,.18)] py-3 text-[1.6rem] font-black uppercase tracking-[-.04em] motion-reduce:animate-none"
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                style={{ animationDelay: `${Math.min(index * 80, 400)}ms` }}
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
