import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: { absolute: "Terms of Service | Calypto" },
  description: "Review the terms that apply when you use Calypto or purchase our products.",
};

const sectionClass = "scroll-mt-24 border-b border-[rgba(241,240,232,.14)] py-8 last:border-b-0";
const paragraphClass = "mt-4 text-sm leading-7 text-[#c9cbbf] sm:text-base";
const textLinkClass = "text-lime underline underline-offset-4";

export default function TermsOfServicePage() {
  return (
    <main className="bg-ink px-4 py-12 text-paper sm:px-6 md:py-16">
      <article className="mx-auto max-w-4xl">
        <header className="border-b border-[rgba(241,240,232,.18)] pb-8">
          <p className="text-xs font-bold uppercase tracking-[.16em] text-lime">
            Shopping with Calypto
          </p>
          <h1 className="mt-3 text-4xl font-black tracking-[-.04em] sm:text-5xl">
            Terms of Service
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-[#c9cbbf] sm:text-base">
            These terms apply when you visit or use the Calypto storefront or purchase products from
            us. Please read them before placing an order.
          </p>
        </header>

        <section aria-labelledby="acceptance" className={sectionClass}>
          <h2 className="text-2xl font-extrabold" id="acceptance">
            Acceptance of terms
          </h2>
          <p className={paragraphClass}>
            By accessing or using our website, creating an account, or placing an order, you agree
            to these Terms of Service and any policies linked here that apply to your use, including
            our{" "}
            <Link className={textLinkClass} href="/privacy">
              Privacy Policy
            </Link>{" "}
            and{" "}
            <Link className={textLinkClass} href="/refund-policy">
              Refund Policy
            </Link>
            . If you do not agree, please do not use the site or place an order.
          </p>
          <p className={paragraphClass}>
            These terms do not limit any consumer rights that cannot legally be excluded or
            restricted under the laws that apply to you.
          </p>
        </section>

        <section aria-labelledby="accounts" className={sectionClass}>
          <h2 className="text-2xl font-extrabold" id="accounts">
            Account responsibilities
          </h2>
          <p className={paragraphClass}>
            You are responsible for providing accurate account information, keeping your password
            confidential, and taking reasonable steps to secure access to your account. You are
            responsible for activity carried out through your account, except where applicable law
            provides otherwise. Contact us promptly if you believe your account has been accessed
            without permission.
          </p>
        </section>

        <section aria-labelledby="products-pricing" className={sectionClass}>
          <h2 className="text-2xl font-extrabold" id="products-pricing">
            Products, availability, and pricing
          </h2>
          <p className={paragraphClass}>
            We make reasonable efforts to display product descriptions, images, colors, sizes,
            specifications, and prices accurately. Our fishing lures and related gear may be
            handcrafted, so minor variations in appearance or finish may occur and may not be
            reflected exactly in product photographs.
          </p>
          <p className={paragraphClass}>
            Product details, availability, promotions, and prices may change without notice.
            Availability is not guaranteed until we accept your order. If we discover a material
            pricing, description, or availability error affecting an order, we may contact you to
            confirm how you wish to proceed or cancel and refund the affected order.
          </p>
        </section>

        <section aria-labelledby="orders-payment" className={sectionClass}>
          <h2 className="text-2xl font-extrabold" id="orders-payment">
            Orders and payment
          </h2>
          <p className={paragraphClass}>
            Placing an order is an offer to purchase the items in your cart. An order is not
            accepted until we confirm it. We may verify order details, payment status, stock,
            delivery information, and suspected fraudulent or unauthorized activity before accepting
            or fulfilling an order.
          </p>
          <p className={paragraphClass}>
            Payment is processed through PayPal or OnePay, depending on the payment method selected
            at checkout. Your payment is also subject to the relevant provider&apos;s terms and
            policies. We do not store payment card numbers in our storefront database.
          </p>
          <p className={paragraphClass}>
            We reserve the right to reject or cancel an order where there is a reasonable basis to
            suspect fraud, unauthorized payment, misuse of the site, a material listing error, or
            inability to fulfill the order. If payment has already been collected for an order we
            cancel, we will arrange a refund to the original payment method, subject to applicable
            law and payment-provider processing.
          </p>
          <p className={paragraphClass}>
            For return eligibility, cancellations, and refund timing, please review our{" "}
            <Link className={textLinkClass} href="/refund-policy">
              Refund Policy
            </Link>
            .
          </p>
        </section>

        <section aria-labelledby="intellectual-property" className={sectionClass}>
          <h2 className="text-2xl font-extrabold" id="intellectual-property">
            Intellectual property
          </h2>
          <p className={paragraphClass}>
            The Calypto name, trademarks, logos, product and website photographs, designs, text,
            graphics, and other website content are owned by Calypto or used with permission and are
            protected by applicable intellectual-property laws. You may use the site for personal,
            non-commercial browsing and shopping. You may not copy, reproduce, distribute, modify,
            or commercially use site content without our prior written permission, except where
            applicable law permits.
          </p>
        </section>

        <section aria-labelledby="disclaimers" className={sectionClass}>
          <h2 className="text-2xl font-extrabold" id="disclaimers">
            Website disclaimers and limitation of liability
          </h2>
          <p className={paragraphClass}>
            We work to keep the website available, accurate, and secure, but we do not guarantee
            uninterrupted or error-free access. The website and its content are provided subject to
            applicable law, and any warranties that may legally be excluded are disclaimed to the
            maximum extent permitted.
          </p>
          <p className={paragraphClass}>
            To the maximum extent permitted by applicable law, Calypto will not be liable for
            indirect, incidental, special, or consequential loss arising from your use of, or
            inability to use, the website or products. Nothing in these terms excludes or limits
            liability that cannot legally be excluded or limited, including applicable consumer
            rights or liability for fraud or intentional misconduct.
          </p>
        </section>

        <section aria-labelledby="governing-law" className={sectionClass}>
          <h2 className="text-2xl font-extrabold" id="governing-law">
            Governing law
          </h2>
          <p className={paragraphClass}>
            These terms are governed by the laws of Sri Lanka, without regard to conflict-of-law
            principles. Courts with jurisdiction in Sri Lanka will have jurisdiction over disputes
            relating to these terms, subject to any mandatory consumer protections or rights to
            bring a claim in another forum that apply to you.
          </p>
        </section>

        <section aria-labelledby="contact" className={sectionClass}>
          <h2 className="text-2xl font-extrabold" id="contact">
            Contact us
          </h2>
          <p className={paragraphClass}>
            If you have questions about these terms or an order, email{" "}
            <a className={textLinkClass} href="mailto:icalypto@gmail.com">
              icalypto@gmail.com
            </a>{" "}
            or visit our{" "}
            <Link className={textLinkClass} href="/contact">
              contact page
            </Link>
            .
          </p>
        </section>
      </article>
    </main>
  );
}
