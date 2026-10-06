import { ContactForm } from "@/components/ContactForm";
import { ArrowUpRight } from "lucide-react";
import { Reveal } from "@/components/Reveal";

export default function ContactPage() {
  return (
    <main className="bg-ink px-[7vw] py-14 text-paper md:px-[10vw] md:py-24">
      <section className="mx-auto max-w-5xl">
        <Reveal>
          <p className="text-[.6rem] font-bold uppercase tracking-[.15em] text-lime">
            Get in touch
          </p>
          <h1 className="my-4 max-w-3xl text-[clamp(2.65rem,9vw,3.8rem)] font-black uppercase leading-[.92] tracking-[-.07em] md:my-5 md:text-[clamp(3.5rem,6vw,6rem)]">
            Let&apos;s talk
            <br />
            <em className="text-lime not-italic">shop.</em>
          </h1>
          <p className="max-w-xl text-[.9rem] leading-[1.55] text-muted md:text-base md:leading-[1.7]">
            Questions about an order, a bait, or anything else. We read every message.
          </p>
        </Reveal>

        <div className="mt-9 grid gap-8 border-t border-[rgba(241,240,232,.18)] pt-6 md:mt-12 md:grid-cols-[1fr_1.2fr] md:gap-12 md:pt-10">
          <Reveal as="article">
            <p className="mb-5 text-[.65rem] font-bold uppercase tracking-[.15em] text-lime">
              Direct contact
            </p>
            <a className="text-lg font-bold md:text-xl" href="mailto:hello@calypto.co">
              hello@calypto.co
            </a>
            <p className="mt-3 max-w-xs leading-[1.6] text-muted">
              We usually reply within 1 business day.
            </p>
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
            <ContactForm />
          </Reveal>
        </div>
      </section>
    </main>
  );
}
