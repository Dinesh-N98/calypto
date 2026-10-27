import type { Metadata } from "next";
import Link from "next/link";
import { CookieSettingsTrigger } from "@/components/CookieSettingsTrigger";

export const metadata: Metadata = {
  title: { absolute: "Privacy Policy | Calypto" },
  description: "Learn how Calypto collects, processes, and protects your data.",
};

const sectionClass = "scroll-mt-24 border-b border-[rgba(241,240,232,.14)] py-8 last:border-b-0";
const paragraphClass = "mt-4 text-sm leading-7 text-[#c9cbbf] sm:text-base";
const listClass = "mt-4 list-disc space-y-2 pl-6 text-sm leading-7 text-[#c9cbbf] sm:text-base";

export default function PrivacyPolicyPage() {
  return (
    <main className="bg-ink px-4 py-12 text-paper sm:px-6 md:py-16">
      <article className="mx-auto max-w-4xl">
        <header className="border-b border-[rgba(241,240,232,.18)] pb-8">
          <p className="text-xs font-bold uppercase tracking-[.16em] text-lime">Your information</p>
          <h1 className="mt-3 text-4xl font-black tracking-[-.04em] sm:text-5xl">Privacy Policy</h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-[#c9cbbf] sm:text-base">
            This policy explains how Calypto collects, uses, stores, and shares information when you
            visit our storefront, create an account, place an order, or contact us.
          </p>
          <p className="mt-3 text-xs text-[#a5a89a]">Last updated: October 22, 2026</p>
        </header>

        <section aria-labelledby="information-we-collect" className={sectionClass}>
          <h2 className="text-2xl font-extrabold" id="information-we-collect">
            Information we collect
          </h2>
          <p className={paragraphClass}>
            The information we handle depends on how you use the site. You may choose not to provide
            optional information, but some account, checkout, or inquiry features may then be
            unavailable.
          </p>
          <ul className={listClass}>
            <li>
              <strong className="text-paper">Accounts and sign-in:</strong> name, email address,
              password hash for password-based accounts, profile details, phone number, and
              connected sign-in provider identifiers. Google sign-in may also provide account
              details such as your name, email, and profile image.
            </li>
            <li>
              <strong className="text-paper">Addresses and orders:</strong> shipping/contact
              details, saved addresses, products and quantities ordered, order totals and currency,
              payment-provider references and status, and fulfillment and tracking information.
            </li>
            <li>
              <strong className="text-paper">Contact and wholesale inquiries:</strong> your name,
              email, business name and optional phone number where supplied, and the message you
              send us.
            </li>
            <li>
              <strong className="text-paper">Newsletter:</strong> your email address when you
              subscribe to receive offers, product updates, or fishing tips.
            </li>
            <li>
              <strong className="text-paper">Site and security information:</strong> browser storage
              preferences, wishlist and cart selections, and limited technical information used to
              operate the storefront, measure site performance, and protect endpoints from excessive
              requests.
            </li>
          </ul>
          <p className={paragraphClass}>
            Please avoid including sensitive personal information that is not needed to respond to
            your message.
          </p>
        </section>

        <section aria-labelledby="how-we-use-information" className={sectionClass}>
          <h2 className="text-2xl font-extrabold" id="how-we-use-information">
            How we use information
          </h2>
          <ul className={listClass}>
            <li>To create and secure accounts, provide saved profile and address features.</li>
            <li>To process orders and payments, arrange delivery, and provide order updates.</li>
            <li>To respond to customer, contact, and wholesale inquiries.</li>
            <li>To send newsletter content when you subscribe and manage opt-out requests.</li>
            <li>To understand storefront performance when you permit optional analytics.</li>
            <li>To protect the service, prevent abuse, and meet applicable legal obligations.</li>
          </ul>
        </section>

        <section aria-labelledby="browser-storage" className={sectionClass}>
          <h2 className="text-2xl font-extrabold" id="browser-storage">
            Browser storage and tracking
          </h2>
          <p className={paragraphClass}>
            Browser storage is not the same as a cookie. The storefront uses local or session
            storage for functional preferences, including:
          </p>
          <ul className={listClass}>
            <li>
              Cart contents, such as product and variant details, prices, and quantities, in local
              storage.
            </li>
            <li>
              Newsletter-modal dismissal or subscription state and cookie-consent preferences in
              local storage.
            </li>
            <li>Preview-announcement dismissal in session storage.</li>
          </ul>
          <p className={paragraphClass}>
            You can clear these values through your browser settings. Clearing them may remove saved
            cart items or cause a dismissed announcement to appear again.
          </p>
          <p className={paragraphClass}>
            If configured, Google Analytics is loaded only after you enable the performance category
            in Cookie Settings. Google Analytics may use cookies and similar technologies to report
            site usage, such as page views, device/browser categories, and general location
            information. Analytics events can include the page URL; avoid placing personal or
            sensitive information in URLs.
          </p>
          <div className="mt-5 rounded-xl border border-[rgba(241,240,232,.16)] bg-[#171a14] p-5">
            <p className="text-sm leading-6 text-[#c9cbbf]">
              You can review or change your optional preferences at any time. Necessary storefront
              functionality remains available.
            </p>
            <div className="mt-3">
              <CookieSettingsTrigger />
            </div>
          </div>
        </section>

        <section aria-labelledby="do-not-track" className={sectionClass}>
          <h2 className="text-2xl font-extrabold" id="do-not-track">
            Do Not Track and analytics choices
          </h2>
          <p className={paragraphClass}>
            Some browsers offer a “Do Not Track” (DNT) signal. This site does not currently
            interpret DNT as a separate preference. Google Analytics is controlled by your
            performance choice in Cookie Settings: it is not loaded unless you enable that category.
            If you have enabled performance analytics, turn it off in Cookie Settings to stop the
            site from loading Google Analytics. A DNT signal by itself does not change a saved
            Cookie Settings choice.
          </p>
          <div className="mt-4">
            <CookieSettingsTrigger />
          </div>
        </section>

        <section aria-labelledby="sharing" className={sectionClass}>
          <h2 className="text-2xl font-extrabold" id="sharing">
            Third-party services
          </h2>
          <p className={paragraphClass}>
            We share information with service providers when needed to run the storefront and
            provide requested services:
          </p>
          <ul className={listClass}>
            <li>
              <strong className="text-paper">Neon:</strong> hosts the PostgreSQL database used for
              account, order, inquiry, and storefront records. Neon object storage is used for
              product images.
            </li>
            <li>
              <strong className="text-paper">PayPal and OnePay:</strong> process payments. The
              relevant provider receives the information needed to initiate or verify a transaction,
              which may include order totals, payment references, contact details, and shipping
              information.
            </li>
            <li>
              <strong className="text-paper">Resend:</strong> delivers shipping-notification emails,
              which include order and shipment details.
            </li>
            <li>
              <strong className="text-paper">Google:</strong> provides optional Google Analytics
              performance reporting and Google sign-in when you choose that sign-in method.
            </li>
          </ul>
          <p className={paragraphClass}>
            These providers process information under their own privacy terms and may process it in
            locations outside your country. We do not store payment card numbers in our storefront
            database.
          </p>
        </section>

        <section aria-labelledby="retention" className={sectionClass}>
          <h2 className="text-2xl font-extrabold" id="retention">
            Data retention and account deletion
          </h2>
          <p className={paragraphClass}>
            We keep information for as long as needed to provide the service, respond to inquiries,
            maintain business records, resolve disputes, and meet applicable legal obligations. The
            period depends on the type of information and why it is needed.
          </p>
          <p className={paragraphClass}>
            You can request deletion of your customer account from Account Settings. Deleting an
            account removes its personal profile, saved addresses, sign-in credentials, and wishlist
            association. Completed transaction records are retained where required for statutory
            accounting and tax compliance. Order records may therefore continue to include the
            information needed to document a transaction, including contact, shipping, and item
            details, even after the account is removed.
          </p>
          <p className={paragraphClass}>
            Account deletion does not automatically unsubscribe an email address from the newsletter
            or remove a separately submitted inquiry. Contact us to request those changes.
          </p>
        </section>

        <section aria-labelledby="your-rights" className={sectionClass}>
          <h2 className="text-2xl font-extrabold" id="your-rights">
            Your choices and privacy rights
          </h2>
          <p className={paragraphClass}>
            Depending on where you live, you may have the right to request access to, correction of,
            or deletion of personal information, and to object to or restrict certain processing.
            Where processing is based on consent, you can withdraw that consent. These rights may be
            subject to exceptions, such as records we must keep to meet legal obligations.
          </p>
          <ul className={listClass}>
            <li>
              To access or delete your account, use Account Settings or email us with your request.
            </li>
            <li>
              Newsletter subscriptions use double opt-in. We send marketing emails only after you
              confirm your email address. You can unsubscribe at any time using the link in each
              newsletter email, or email us and ask to be removed from the list.
            </li>
            <li>
              To change analytics or other optional preferences, use the Cookie Settings control
              above.
            </li>
          </ul>
          <p className={paragraphClass}>
            To help us protect your information, we may need to verify your identity before
            completing a request. Contact{" "}
            <a className="text-lime underline underline-offset-4" href="mailto:icalypto@gmail.com">
              icalypto@gmail.com
            </a>{" "}
            for privacy, access, deletion, correction, or newsletter opt-out requests.
          </p>
          <h3 className="mt-7 text-lg font-bold text-paper">European data protection rights</h3>
          <p className={paragraphClass}>
            If the GDPR or similar European data protection law applies to you, you may have rights
            to access and receive a copy of your personal data, correct inaccurate data, request
            erasure or restriction, receive certain data in a portable format, object to certain
            processing, and withdraw consent where processing relies on consent. You may also lodge
            a complaint with your local data protection supervisory authority. These rights may be
            subject to legal conditions and exceptions.
          </p>
          <h3 className="mt-7 text-lg font-bold text-paper">California consumer rights</h3>
          <p className={paragraphClass}>
            If California privacy law applies to you, you may have rights to know/access, correct,
            and request deletion of personal information, and to opt out of its sale or sharing for
            cross-context behavioral advertising. You also have the right not to receive
            discriminatory treatment for exercising applicable privacy rights. Calypto does not sell
            personal information for money or use it for cross-context behavioral advertising. We do
            disclose information to service providers for the purposes described in this policy; to
            submit a request or ask about an opt-out, email us at{" "}
            <a className="text-lime underline underline-offset-4" href="mailto:icalypto@gmail.com">
              icalypto@gmail.com
            </a>
            .
          </p>
        </section>

        <section aria-labelledby="contact" className={sectionClass}>
          <h2 className="text-2xl font-extrabold" id="contact">
            Contact us
          </h2>
          <p className={paragraphClass}>
            Questions about this policy or how we handle your information? Email{" "}
            <a className="text-lime underline underline-offset-4" href="mailto:icalypto@gmail.com">
              icalypto@gmail.com
            </a>{" "}
            or use our{" "}
            <Link className="text-lime underline underline-offset-4" href="/contact">
              contact form
            </Link>
            .
          </p>
        </section>

        <section aria-labelledby="policy-updates" className={sectionClass}>
          <h2 className="text-2xl font-extrabold" id="policy-updates">
            Changes to this policy
          </h2>
          <p className={paragraphClass}>
            We may update this policy as our practices or legal requirements change. When we do, we
            will post the revised policy here and update the “Last updated” date at the top of this
            page. Please review this page periodically for the latest information. If a change
            requires notice or consent under applicable law, we will provide that notice or obtain
            consent as required.
          </p>
        </section>
      </article>
    </main>
  );
}
