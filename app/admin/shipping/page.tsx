import type { Metadata } from "next";
import { SriLankaShippingSettingsForm } from "@/components/admin/SriLankaShippingSettingsForm";
import { getSriLankaShippingRateSettings } from "@/lib/checkout/sri-lanka-shipping";
import { requireAdminPage } from "@/lib/admin";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Shipping rates" };

export default async function ShippingSettingsPage() {
  await requireAdminPage("/admin/shipping");
  const rates = await getSriLankaShippingRateSettings();

  return (
    <div className="space-y-8">
      <section>
        <p className="text-xs font-bold uppercase tracking-[.14em] text-[#718126]">Settings</p>
        <h1 className="mt-2 text-3xl font-black tracking-[-.04em]">Sri Lanka shipping rates</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[#65695f]">
          These USD rates are used for Sri Lankan orders only when DHL returns no usable domestic
          service. DHL rates continue to be used when available.
        </p>
      </section>
      <SriLankaShippingSettingsForm initialRates={rates} />
    </div>
  );
}
