import Link from "next/link";
import { CrmInteractionForm } from "@/components/admin/CrmInteractionForm";

type CustomerProfile = {
  id: string;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string;
  phone: string | null;
  orders: {
    id: string;
    email: string;
    totalCents: number;
    currency: string;
    status: string;
    fulfillmentStatus: string | null;
    createdAt: Date;
  }[];
  crmInteractions: {
    id: string;
    type: string;
    subject: string | null;
    content: string;
    occurredAt: Date;
    author: { id: string; name: string | null };
  }[];
};

function displayName(customer: CustomerProfile): string {
  return (
    [customer.firstName, customer.lastName].filter(Boolean).join(" ") ||
    customer.name ||
    "Unnamed customer"
  );
}

export function CrmCustomerDetail({ customer }: { customer: CustomerProfile }) {
  return (
    <section aria-labelledby="crm-customer-title" className="space-y-6">
      <header>
        <Link
          className="text-xs font-bold uppercase tracking-[.06em] text-[#55594f] underline underline-offset-4 hover:text-[#171a14] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#718126]"
          href="/admin/crm/customers"
        >
          Back to customers
        </Link>
        <p className="mt-5 text-xs font-bold uppercase tracking-[.14em] text-[#718126]">CRM</p>
        <h1 className="mt-2 text-3xl font-black tracking-[-.04em]" id="crm-customer-title">
          {displayName(customer)}
        </h1>
      </header>

      <div className="grid gap-4 rounded-lg border border-black/10 bg-white p-5 shadow-sm sm:grid-cols-2">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.08em] text-[#65695f]">Email</p>
          <a
            className="mt-1 inline-block text-sm font-semibold underline underline-offset-2 hover:text-[#718126]"
            href={`mailto:${customer.email}`}
          >
            {customer.email}
          </a>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-[.08em] text-[#65695f]">Phone</p>
          <p className="mt-1 text-sm font-semibold">{customer.phone || "Not provided"}</p>
        </div>
      </div>

      <section aria-labelledby="crm-customer-orders-title" className="space-y-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-xl font-bold" id="crm-customer-orders-title">
            Recent orders
          </h2>
          <span className="text-xs text-[#65695f]">Latest 20</span>
        </div>
        {customer.orders.length === 0 ? (
          <div className="rounded-lg border border-black/10 bg-white p-5 text-sm text-[#65695f]">
            This customer has no linked orders.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-black/10 bg-white shadow-sm">
            <table className="w-full min-w-[620px] border-collapse text-left text-sm">
              <thead className="bg-[#f4f5f1] text-xs uppercase tracking-[.08em] text-[#55594f]">
                <tr>
                  <th className="px-4 py-3">Order</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/10">
                {customer.orders.map((order) => (
                  <tr key={order.id}>
                    <td className="px-4 py-4 font-bold">{order.id}</td>
                    <td className="px-4 py-4 text-[#55594f]">
                      {new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(
                        order.createdAt,
                      )}
                    </td>
                    <td className="px-4 py-4 text-[#55594f]">
                      {new Intl.NumberFormat("en-US", {
                        style: "currency",
                        currency: order.currency,
                      }).format(order.totalCents / 100)}
                    </td>
                    <td className="px-4 py-4">
                      <span className="block">{order.status}</span>
                      {order.fulfillmentStatus && (
                        <span className="mt-1 block text-xs text-[#65695f]">
                          {order.fulfillmentStatus}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section aria-labelledby="crm-customer-timeline-title" className="space-y-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-xl font-bold" id="crm-customer-timeline-title">
            Interaction timeline
          </h2>
          <span className="text-xs text-[#65695f]">Latest 50</span>
        </div>
        {customer.crmInteractions.length === 0 ? (
          <div className="rounded-lg border border-black/10 bg-white p-5 text-sm text-[#65695f]">
            No interactions have been recorded.
          </div>
        ) : (
          <ol className="space-y-3">
            {customer.crmInteractions.map((interaction) => (
              <li
                className="border-l-2 border-[#a3bd32] bg-white p-4 shadow-sm"
                key={interaction.id}
              >
                <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                  <p className="text-sm font-bold">{interaction.subject || interaction.type}</p>
                  <time
                    className="text-xs text-[#65695f]"
                    dateTime={interaction.occurredAt.toISOString()}
                  >
                    {new Intl.DateTimeFormat("en-US", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }).format(interaction.occurredAt)}
                  </time>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#45483f]">
                  {interaction.content}
                </p>
                <p className="mt-3 text-xs text-[#65695f]">
                  {interaction.type} · {interaction.author.name || "Admin"}
                </p>
              </li>
            ))}
          </ol>
        )}
      </section>

      <CrmInteractionForm customerId={customer.id} />
    </section>
  );
}
