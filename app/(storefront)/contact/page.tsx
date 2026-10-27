import type { Metadata } from "next";
import Link from "next/link";
import { ContactForm } from "@/components/ContactForm";
import { ArrowUpRight } from "lucide-react";
import { Reveal } from "@/components/Reveal";

export const metadata: Metadata = {
  title: { absolute: "Contact Us | Calypto" },
  description:
    "Get in touch with Calypto for order inquiries, soft plastic lure questions, or wholesale partnerships.",
};

export default async function ContactPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const { code } = await searchParams;
  const initialDiscountCode = typeof code === "string" && code.length <= 32
    ? code.trim().toUpperCase()
    : "";

  return (
    <main className="bg-ink px-4 py-12 text-paper sm:px-6 md:py-16">
      <section className="mx-auto max-w-4xl">
        <Reveal>
          <p className="text-[.6rem] font-bold uppercase tracking-[.15em] text-lime">
            Get in touch
          </p>
          <h1 className="my-4 max-w-3xl text-[clamp(2.65rem,9vw,3.8rem)] font-black uppercase leading-[.92] tracking-[-.07em] md:my-5 md:text-[clamp(3.5rem,6vw,6rem)]">
            Let&apos;s talk
          </h1>
          <p className="max-w-xl text-sm leading-7 text-[#c9cbbf] sm:text-base">
            Get in touch with Calypto for order inquiries, soft plastic lure questions, or wholesale
            partnerships. We read every message.
          </p>
        </Reveal>

        <div className="mt-9 grid gap-8 border-t border-[rgba(241,240,232,.18)] pt-6 md:mt-12 md:grid-cols-[1fr_1.2fr] md:gap-12 md:pt-10">
          <Reveal as="article">
            <p className="mb-5 text-[.65rem] font-bold uppercase tracking-[.15em] text-lime">
              Direct contact
            </p>
            <a
              className="text-lg font-bold underline decoration-[rgba(241,240,232,.25)] underline-offset-4 transition-colors hover:text-lime md:text-xl"
              href="mailto:icalypto@gmail.com"
            >
              icalypto@gmail.com
            </a>
            <p className="mt-3 max-w-xs text-sm leading-7 text-[#c9cbbf]">
              We typically respond within 24 - 48 hours.
            </p>
            <Link
              className="mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-lime underline underline-offset-4 transition-colors hover:text-paper"
              href="/wholesale"
            >
              Wholesale inquiries
              <ArrowUpRight aria-hidden="true" className="h-4 w-4 shrink-0" strokeWidth={2} />
            </Link>
            <div className="mt-8 flex gap-5 text-[.7rem] font-extrabold uppercase tracking-[.12em] text-lime">
              <a className="inline-flex items-center gap-1.5" href="#instagram">
                Instagram{" "}
                <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
              </a>
              <a className="inline-flex items-center gap-1.5" href="#youtube">
                YouTube{" "}
                <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
              </a>
            </div>
          </Reveal>

          <Reveal
            as="article"
            className="border-t border-[rgba(241,240,232,.18)] pt-6 md:border-l md:border-t-0 md:pl-10 md:pt-0"
          >
            <p className="mb-5 text-[.65rem] font-bold uppercase tracking-[.15em] text-lime">
              Send a message
            </p>
            <ContactForm initialDiscountCode={initialDiscountCode} />
          </Reveal>
        </div>
      </section>
    </main>
  );
}
