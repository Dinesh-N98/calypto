"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const links = [
  { href: "/account", label: "Overview" },
  { href: "/account/orders", label: "Orders" },
  { href: "/account/addresses", label: "Addresses" },
  { href: "/account/settings", label: "Profile & security" },
];

export function AccountNavigation() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <nav
      aria-label="Account navigation"
      className="sticky top-16 z-40 w-full max-w-full border-b border-ink/15 bg-paper/95 py-2 backdrop-blur-sm sm:static sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none md:sticky md:top-24 md:self-start"
    >
      <label className="sr-only" htmlFor="account-route-select">
        Account section
      </label>
      <select
        className="block min-h-11 w-full border border-ink/20 bg-paper px-4 py-3 text-sm font-bold uppercase tracking-wider text-ink focus:border-ink focus:outline-none sm:hidden"
        id="account-route-select"
        onChange={(event) => router.push(event.currentTarget.value)}
        value={pathname}
      >
        {links.map(({ href, label }) => {
          return (
            <option key={href} value={href}>
              {label}
            </option>
          );
        })}
      </select>
      <ul className="hidden w-full items-center gap-2 border-b border-ink/15 pb-2 sm:flex md:grid md:border-0 md:pb-0">
        {links.map(({ href, label }) => {
          const isCurrent = pathname === href;
          return (
            <li className="shrink-0" key={href}>
              <Link
                aria-current={isCurrent ? "page" : undefined}
                className={`relative inline-flex min-h-11 items-center whitespace-nowrap border px-3 py-2 text-xs font-bold uppercase tracking-[.08em] transition-colors motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-olive sm:px-4 sm:py-2.5 sm:text-sm md:w-full md:px-3 ${
                  isCurrent
                    ? "border-olive bg-ink text-paper"
                    : "border-ink/20 bg-white/60 text-ink hover:border-ink"
                }`}
                href={href}
              >
                <span className={isCurrent ? "relative z-10 text-paper" : "text-ink"}>
                  {label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
