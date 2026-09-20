import { ContactForm } from "@/components/ContactForm";

export default function ContactPage() {
  return (
    <main className="bg-ink px-[7vw] py-20 text-paper md:px-[10vw] md:py-28">
      <section className="mx-auto max-w-5xl">
        <p className="text-[.65rem] font-bold uppercase tracking-[.18em] text-lime">Get in touch</p>
        <h1 className="my-5 max-w-3xl text-[4rem] font-black uppercase leading-[.88] tracking-[-.07em] md:text-[clamp(4rem,8vw,8rem)]">
          Let&apos;s talk<br />
          <em className="text-lime not-italic">shop.</em>
        </h1>
        <p className="max-w-xl leading-[1.7] text-muted">
          Questions about an order, a bait, or anything else. We read every message.
        </p>

        <div className="mt-12 grid gap-12 border-t border-[rgba(241,240,232,.18)] pt-8 md:grid-cols-[1fr_1.2fr] md:pt-10">
          <section>
            <p className="mb-5 text-[.65rem] font-bold uppercase tracking-[.15em] text-lime">
              Direct contact
            </p>
            <a className="text-xl font-bold" href="mailto:hello@calypto.co">
              hello@calypto.co
            </a>
            <p className="mt-3 max-w-xs leading-[1.6] text-muted">
              We usually reply within 1 business day.
            </p>
            <div className="mt-8 flex gap-5 text-[.7rem] font-extrabold uppercase tracking-[.12em] text-lime">
              <a href="#instagram">Instagram ↗</a>
              <a href="#youtube">YouTube ↗</a>
            </div>
          </section>

          <section className="border-t border-[rgba(241,240,232,.18)] pt-6 md:border-l md:border-t-0 md:pl-10 md:pt-0">
            <p className="mb-5 text-[.65rem] font-bold uppercase tracking-[.15em] text-lime">
              Send a message
            </p>
            <ContactForm />
          </section>
        </div>
      </section>
    </main>
  );
}