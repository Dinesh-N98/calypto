import type { Metadata } from "next";
import { NewsletterDiscountManager } from "@/components/admin/NewsletterDiscountManager";
import { requireAdminPage } from "@/lib/admin";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Newsletter discount codes" };

export default async function NewsletterDiscountsPage() {
  await requireAdminPage("/admin/newsletter-discounts");

  return (
    <div className="space-y-8">
      <section>
        <p className="text-xs font-bold uppercase tracking-[.14em] text-[#718126]">Orders</p>
        <h1 className="mt-2 text-3xl font-black tracking-[-.04em]">Newsletter discount codes</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[#65695f]">
          Verify a code during a manual order inquiry and mark it redeemed after applying it to the
          subscriber&apos;s first order. The discount applies to product subtotal only, not shipping
          or tax.
        </p>
      </section>
      <NewsletterDiscountManager />
    </div>
  );
}
