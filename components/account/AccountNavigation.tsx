"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/account", label: "Overview" },
  { href: "/account/orders", label: "Orders" },
  { href: "/account/wishlist", label: "Wishlist" },
];

export function AccountNavigation() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Account navigation"
      className="sticky top-0 z-40 flex w-full min-w-0 items-center border-b border-border bg-background/95 px-4 py-2 text-foreground backdrop-blur-sm md:self-start md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none"
    >
      <ul className="scrollbar-none flex w-full min-w-0 snap-x snap-mandatory scroll-smooth items-center gap-2 overflow-x-auto overscroll-x-contain pb-1 pr-4 motion-reduce:scroll-auto md:grid md:grid-cols-1 md:overflow-visible md:pb-0 md:pr-0">
        {links.map(({ href, label }) => {
          const isCurrent = pathname === href;
          return (
            <li className="shrink-0 snap-start" key={href}>
              <Link
                aria-current={isCurrent ? "page" : undefined}
                className={`relative inline-flex min-h-11 items-center whitespace-nowrap border px-3 py-2 text-xs font-bold uppercase tracking-[.08em] transition-colors motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-olive sm:px-4 sm:py-2.5 sm:text-sm md:w-full md:px-3 ${
                  isCurrent
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-foreground hover:border-primary"
                }`}
                href={href}
              >
                <span
                  className={
                    isCurrent ? "relative z-10 text-primary-foreground" : "text-foreground"
                  }
                >
                  {label}
                </span>
                {isCurrent && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-3 bottom-0 h-0.5 bg-primary-foreground"
                  />
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
