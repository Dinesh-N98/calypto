import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Reveal } from "@/components/Reveal";
import { CookieSettingsTrigger } from "@/components/CookieSettingsTrigger";

const linkClassName =
  "inline-flex min-h-11 items-center text-sm text-muted transition-colors duration-200 hover:text-[#84cc16] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#84cc16]";
const legalLinkClassName =
  "inline-flex min-h-11 items-center text-zinc-400 transition-colors duration-200 hover:text-[#84cc16]";

export function Footer({ categories }: { categories: { name: string; slug: string }[] }) {
  return (
    <footer className="bg-[#080908] text-paper">
      <Reveal className="site-container px-[7vw] pt-10 md:px-[10vw] md:pt-16" direction="none">
        <div className="grid grid-cols-2 divide-y divide-white/10 md:gap-x-10 md:divide-y-0 xl:grid-cols-6">
          <div className="col-span-2 flex min-w-0 flex-col items-start gap-5 py-8 md:py-8 md:pr-8 xl:col-span-2 xl:py-0">
            <div>
              <Link
                className="inline-flex items-start text-2xl font-black tracking-[.12em] transition-colors hover:text-[#84cc16]"
                href="/"
              >
                calypto<span className="ml-0.5 align-top text-[.5em] text-[#84cc16]">™</span>
              </Link>
              <p className="mt-3 max-w-xs text-sm leading-6 text-muted">
                Purpose-built soft plastics for anglers who live for the next bite.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <a
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/10 px-4 text-xs font-semibold text-muted transition-colors hover:border-[#84cc16]/50 hover:text-[#84cc16] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#84cc16]"
                href="#instagram"
              >
                Instagram
                <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={2} />
              </a>
              <a
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/10 px-4 text-xs font-semibold text-muted transition-colors hover:border-[#84cc16]/50 hover:text-[#84cc16] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#84cc16]"
                href="#youtube"
              >
                YouTube
                <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={2} />
              </a>
            </div>
          </div>

          <div className="flex min-w-0 flex-col items-start gap-1 py-8 md:py-8 xl:py-0">
            <h3 className="mb-2 text-xs font-bold uppercase tracking-[.16em] text-[#84cc16]">
              Shop
            </h3>
            <Link className={linkClassName} href="/shop">
              All baits
            </Link>
            {categories.map((category) => (
              <Link
                className={linkClassName}
                href={`/shop?category=${category.slug}`}
                key={category.slug}
              >
                {category.name}
              </Link>
            ))}
          </div>

          <div className="flex min-w-0 flex-col items-start gap-1 py-8 md:py-8 xl:py-0">
            <h3 className="mb-2 text-xs font-bold uppercase tracking-[.16em] text-[#84cc16]">
              Company
            </h3>
            <Link className={linkClassName} href="/about">
              Our story
            </Link>
            <Link className={linkClassName} href="/wholesale">
              Wholesale
            </Link>
            <Link className={linkClassName} href="/contact">
              Contact
            </Link>
          </div>

          <div className="col-span-2 min-w-0 py-8 md:py-8 xl:col-span-2 xl:py-0">
            <div className="flex h-full min-w-0 flex-col items-start gap-4 rounded-sm border border-white/10 bg-white/[.03] p-5 sm:p-6">
              <h3 className="text-xs font-bold uppercase tracking-[.16em] text-[#84cc16]">
                Stay connected
              </h3>
              <p className="max-w-prose break-words text-sm leading-6 text-muted">
                Questions about the lineup? We’re here to help you find your next favorite.
              </p>
              <Link
                className="inline-flex min-h-11 items-center gap-2 rounded-sm bg-[#84cc16] px-4 text-xs font-extrabold uppercase tracking-[.08em] text-[#080908] transition-colors hover:bg-lime focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#84cc16]"
                href="/contact"
              >
                Get in touch
                <ArrowUpRight aria-hidden="true" className="h-4 w-4" strokeWidth={2} />
              </Link>
              <a className={linkClassName} href="mailto:icalypto@gmail.com">
                icalypto@gmail.com
              </a>
            </div>
          </div>
        </div>

        <div className="mt-8 flex min-w-0 flex-col gap-3 border-t border-white/10 py-6 text-xs text-muted sm:flex-row sm:items-center sm:justify-between sm:gap-6">
          <small className="block">© 2026 calypto. Built for the bite.</small>
          <nav
            aria-label="Legal and privacy"
            className="flex min-w-0 flex-wrap items-center gap-x-6 gap-y-2"
          >
            <Link className={legalLinkClassName} href="/privacy">
              Privacy Policy
            </Link>
            <Link className={legalLinkClassName} href="/terms">
              Terms of Service
            </Link>
            <Link className={legalLinkClassName} href="/refund-policy">
              Refund Policy
            </Link>
            <span className="inline-flex min-h-11 items-center [&_button]:!self-center [&_button]:text-zinc-400 [&_button]:transition-colors [&_button]:duration-200 [&_button:hover]:text-[#84cc16]">
              <CookieSettingsTrigger />
            </span>
          </nav>
        </div>
      </Reveal>
    </footer>
  );
}
