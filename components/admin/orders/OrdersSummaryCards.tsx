import type { AdminOrdersResult } from "@/lib/admin-orders";

type Summary = AdminOrdersResult["summary"];

function formatRevenue(revenue: Summary["revenueByCurrency"]): string {
  if (revenue.length === 0) return "—";

  return revenue
    .map(({ currency, totalCents }) =>
      new Intl.NumberFormat("en-US", {
        style: "currency",
        currency,
      }).format(totalCents / 100),
    )
    .join(" · ");
}

export function OrdersSummaryCards({ summary }: { summary: Summary }) {
  const metrics = [
    { label: "Total orders", value: summary.totalOrders.toLocaleString("en-US") },
    { label: "Pending orders", value: summary.pendingOrders.toLocaleString("en-US") },
    { label: "Paid revenue", value: formatRevenue(summary.revenueByCurrency) },
    {
      label: "Fulfillment",
      value: `${summary.shippedOrders.toLocaleString("en-US")} shipped · ${summary.unfulfilledOrders.toLocaleString("en-US")} unfulfilled`,
    },
  ];

  return (
    <section aria-label="Order summary" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map(({ label, value }) => (
        <article className="rounded-xl border border-black/10 bg-white p-5 shadow-sm" key={label}>
          <p className="text-xs font-semibold uppercase tracking-[.1em] text-[#65695f]">{label}</p>
          <p className="mt-3 break-words text-2xl font-black tracking-[-.04em] text-[#171a14]">
            {value}
          </p>
        </article>
      ))}
    </section>
  );
}
