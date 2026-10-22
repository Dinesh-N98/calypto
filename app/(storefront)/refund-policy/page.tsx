import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: { absolute: "Refund Policy | Calypto" },
  description: "Learn about Calypto returns, replacements, cancellations, and refunds.",
};

const sectionClass = "scroll-mt-24 border-b border-[rgba(241,240,232,.14)] py-8 last:border-b-0";
const paragraphClass = "mt-4 text-sm leading-7 text-[#c9cbbf] sm:text-base";
const listClass = "mt-4 list-disc space-y-2 pl-6 text-sm leading-7 text-[#c9cbbf] sm:text-base";
const emailLinkClass = "text-lime underline underline-offset-4";
const contactLinkClass = "text-lime underline underline-offset-4";

export default function RefundPolicyPage() {
  return (
    <main className="bg-ink px-4 py-12 text-paper sm:px-6 md:py-16">
      <article className="mx-auto max-w-4xl">
        <header className="border-b border-[rgba(241,240,232,.18)] pb-8">
          <p className="text-xs font-bold uppercase tracking-[.16em] text-lime">
            Orders and returns
          </p>
          <h1 className="mt-3 text-4xl font-black tracking-[-.04em] sm:text-5xl">Refund Policy</h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-[#c9cbbf] sm:text-base">
            We want you to be happy with your Calypto order. This policy explains when items may be
            returned, how to report a delivery issue, and what to expect when a refund is approved.
          </p>
        </header>

        <section aria-labelledby="return-eligibility" className={sectionClass}>
          <h2 className="text-2xl font-extrabold" id="return-eligibility">
            Return eligibility and timeframe
          </h2>
          <p className={paragraphClass}>
            You may request a return within 30 days of the date your order is delivered. For a
            standard return, items must be unused, unopened, and in their original packaging. Please
            contact us before sending anything back so we can provide return instructions.
          </p>
          <p className={paragraphClass}>
            The following items are not eligible for standard returns:
          </p>
          <ul className={listClass}>
            <li>
              Used gear or items that have been opened or are not in their original packaging.
            </li>
            <li>Custom or made-to-order items.</li>
            <li>Clearance or final-sale items.</li>
          </ul>
          <p className={paragraphClass}>
            These exclusions do not limit your rights under applicable law or apply to a verified
            report that an item arrived damaged or incorrect.
          </p>
        </section>

        <section aria-labelledby="damaged-incorrect" className={sectionClass}>
          <h2 className="text-2xl font-extrabold" id="damaged-incorrect">
            Damaged or incorrect deliveries
          </h2>
          <p className={paragraphClass}>
            If an item arrives damaged, defective, or different from what you ordered, contact us as
            soon as possible—ideally within 48 hours and no later than 72 hours after delivery.
            Include your order reference, a brief description of the issue, and clear photos of the
            item, its packaging, and any visible damage.
          </p>
          <p className={paragraphClass}>
            Email{" "}
            <a className={emailLinkClass} href="mailto:icalypto@gmail.com">
              icalypto@gmail.com
            </a>{" "}
            or use our{" "}
            <Link className={contactLinkClass} href="/contact">
              contact form
            </Link>
            . Once we verify that the issue was caused by a seller or shipping error, we will
            arrange a free replacement or a full refund. We will provide any return or disposal
            instructions if needed; do not ship the item back until we have contacted you.
          </p>
        </section>

        <section aria-labelledby="return-shipping" className={sectionClass}>
          <h2 className="text-2xl font-extrabold" id="return-shipping">
            Return shipping costs
          </h2>
          <p className={paragraphClass}>
            For a standard change-of-mind return, you are responsible for the cost of return
            shipping. If we verify that an item arrived damaged or incorrect, we will cover
            reasonable return shipping costs or provide an appropriate return method.
          </p>
        </section>

        <section aria-labelledby="refund-processing" className={sectionClass}>
          <h2 className="text-2xl font-extrabold" id="refund-processing">
            Refund processing
          </h2>
          <p className={paragraphClass}>
            After an eligible return reaches us and passes inspection, we will notify you whether
            the refund is approved. Approved refunds are issued to the original payment method:
            PayPal for PayPal purchases, or the original card/payment method processed through
            OnePay. We cannot send a refund to a different payment method.
          </p>
          <p className={paragraphClass}>
            We aim to initiate approved refunds within 3–7 business days after return inspection.
            Your bank or payment provider may take additional time to post the credit. For a damaged
            or incorrect item resolved without a return, we will confirm the refund or replacement
            arrangement with you directly.
          </p>
          <p className={paragraphClass}>
            To request a return or check on a refund, email{" "}
            <a className={emailLinkClass} href="mailto:icalypto@gmail.com">
              icalypto@gmail.com
            </a>{" "}
            with your order reference, or contact us through our{" "}
            <Link className={contactLinkClass} href="/contact">
              contact page
            </Link>
            .
          </p>
        </section>

        <section aria-labelledby="cancellations" className={sectionClass}>
          <h2 className="text-2xl font-extrabold" id="cancellations">
            Order cancellations
          </h2>
          <p className={paragraphClass}>
            Orders can only be canceled before they are dispatched or otherwise enter fulfillment.
            Contact us promptly with your order reference at{" "}
            <a className={emailLinkClass} href="mailto:icalypto@gmail.com">
              icalypto@gmail.com
            </a>{" "}
            or through our{" "}
            <Link className={contactLinkClass} href="/contact">
              contact form
            </Link>
            . We will confirm whether cancellation is still possible. Once an order has been
            dispatched, it cannot be canceled; you may request a return under the eligibility terms
            above.
          </p>
        </section>

        <section aria-labelledby="contact-support" className={sectionClass}>
          <h2 className="text-2xl font-extrabold" id="contact-support">
            Questions?
          </h2>
          <p className={paragraphClass}>
            We can help with returns, damaged or incorrect deliveries, cancellations, and refund
            status. Email{" "}
            <a className={emailLinkClass} href="mailto:icalypto@gmail.com">
              icalypto@gmail.com
            </a>{" "}
            or visit our{" "}
            <Link className={contactLinkClass} href="/contact">
              contact page
            </Link>
            . Please include your order reference so we can assist you.
          </p>
        </section>
      </article>
    </main>
  );
}
