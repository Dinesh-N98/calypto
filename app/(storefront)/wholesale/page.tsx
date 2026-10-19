import { Reveal } from "@/components/Reveal";
import { WholesaleForm } from "@/components/WholesaleForm";

export default function WholesalePage() {
  return (
    <main>
      <section className="bg-ink px-[7vw] py-14 text-paper md:px-[10vw] md:py-24">
        <Reveal className="mx-auto max-w-5xl">
          <p className="text-[.6rem] font-bold uppercase tracking-[.15em] text-lime">
            For the ones who stock the good stuff
          </p>
          <h1 className="my-4 max-w-4xl text-[clamp(2.65rem,9vw,3.8rem)] font-black uppercase leading-[.92] tracking-[-.07em] md:my-5 md:text-[clamp(3.5rem,6vw,6rem)]">
            Your next bestselling bait
            <br />
            <em className="text-lime not-italic">starts here.</em>
          </h1>
          <p className="max-w-2xl text-[.9rem] leading-[1.55] text-muted md:text-base md:leading-[1.7]">
            We build custom bait mold designs and hand-finished airbrush paintwork for shops that
            want product with edge. Every run is handmade, designed around your idea, with low MOQ,
            fast delivery, and direct communication from first sketch to final shipment.
          </p>
        </Reveal>
      </section>

      <section
        id="wholesale-inquiry"
        className="bg-paper px-[7vw] py-14 text-ink md:px-[10vw] md:py-24"
      >
        <Reveal className="mx-auto max-w-5xl">
          <p className="text-[.6rem] font-bold uppercase tracking-[.15em] text-lime">
            Wholesale inquiry
          </p>
          <h2 className="my-4 max-w-3xl text-[clamp(2.5rem,8vw,3.5rem)] font-black uppercase leading-[.92] tracking-[-.07em] md:my-5 md:text-[clamp(3rem,5vw,5.25rem)]">
            Tell us what
            <br />
            <em className="text-lime not-italic">you need.</em>
          </h2>

          <div className="mt-9 grid gap-8 border-t border-[rgba(16,16,14,.18)] pt-6 md:mt-12 md:grid-cols-[1fr_1.2fr] md:gap-12 md:pt-10">
            <Reveal as="article">
              <p className="mb-5 text-[.65rem] font-bold uppercase tracking-[.15em] text-lime">
                What we can do
              </p>
              <ul className="space-y-3 text-[.9rem] leading-[1.6] text-[#2b2d2a]">
                <li>Custom bait mold design and airbrush paintwork.</li>
                <li>Handmade production for shops that want something unique.</li>
                <li>Low MOQ and fast delivery with clear communication.</li>
              </ul>
              <p className="mt-8 text-[.8rem] font-bold uppercase tracking-[.12em] text-lime">
                <a href="mailto:hello@calypto.co">hello@calypto.co</a>
              </p>
            </Reveal>

            <Reveal
              as="article"
              className="border-t border-[rgba(16,16,14,.18)] pt-6 md:border-l md:border-t-0 md:pl-10 md:pt-0"
            >
              <p className="mb-5 text-[.65rem] font-bold uppercase tracking-[.15em] text-lime">
                Send your details
              </p>
              <WholesaleForm />
            </Reveal>
          </div>
        </Reveal>
      </section>

    </main>
  );
}
