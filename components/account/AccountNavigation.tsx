"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/account", label: "Overview" },
  { href: "/account/orders", label: "Orders" },
  { href: "/account/addresses", label: "Addresses" },
  { href: "/account/settings", label: "Profile & security" },
];

export function AccountNavigation() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Account navigation"
      className="sticky top-16 z-40 -mx-4 border-b border-ink/15 bg-paper/95 px-4 py-2 backdrop-blur-sm sm:-mx-6 sm:px-6 md:top-24 md:mx-0 md:self-start md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none"
    >
      <ul className="account-nav-scroll flex snap-x snap-mandatory scroll-smooth gap-2 overflow-x-auto overscroll-x-contain pb-1 pr-4 motion-reduce:scroll-auto md:grid md:overflow-visible md:pb-0 md:pr-0">
        {links.map(({ href, label }) => {
          const isCurrent = pathname === href;
          return (
            <li className="shrink-0 snap-start" key={href}>
              <Link
                aria-current={isCurrent ? "page" : undefined}
                className={`relative inline-flex min-h-11 items-center whitespace-nowrap border px-4 text-[.65rem] font-bold uppercase tracking-[.08em] transition-colors motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-olive md:w-full md:px-3 ${
                  isCurrent
                    ? "border-olive bg-ink text-paper"
                    : "border-ink/20 bg-white/60 text-ink hover:border-ink"
                }`}
                href={href}
              >
                <span className={isCurrent ? "relative z-10 text-paper" : "text-ink"}>
                  {label}
                </span>
                {isCurrent && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-3 bottom-0 h-0.5 bg-lime"
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
