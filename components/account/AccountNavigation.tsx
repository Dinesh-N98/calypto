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
    <nav aria-label="Account navigation" className="md:sticky md:top-24 md:self-start">
      <ul className="flex snap-x snap-mandatory gap-2 overflow-x-auto pb-2 md:grid md:overflow-visible md:pb-0">
        {links.map(({ href, label }) => {
          const isCurrent = pathname === href;
          return (
            <li className="shrink-0 snap-start" key={href}>
              <Link
                aria-current={isCurrent ? "page" : undefined}
                className={`inline-flex min-h-11 items-center whitespace-nowrap border px-4 text-[.65rem] font-bold uppercase tracking-[.08em] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#65771b] md:w-full md:px-3 ${
                  isCurrent
                    ? "border-ink bg-ink text-paper"
                    : "border-ink/20 bg-white/60 text-ink hover:border-ink"
                }`}
                href={href}
              >
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
