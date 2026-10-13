import { notFound } from "next/navigation";
import { CrmCustomerDetail } from "@/components/admin/CrmCustomerDetail";
import { getCrmCustomerProfile } from "@/lib/actions/crm";

export const dynamic = "force-dynamic";

export default async function CrmCustomerDetailPage({
  params,
}: {
  params: Promise<{ customerId: string }>;
}) {
  const { customerId } = await params;
  const result = await getCrmCustomerProfile(customerId);
  if (!result.ok) notFound();

  return <CrmCustomerDetail customer={result.customer} />;
}
