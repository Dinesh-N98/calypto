const paymentClasses: Record<string, string> = {
  PAID: "bg-emerald-50 text-emerald-800 ring-emerald-700/20",
  PENDING: "bg-amber-50 text-amber-800 ring-amber-700/20",
  CANCELLED: "bg-rose-50 text-rose-800 ring-rose-700/20",
  REFUNDED: "bg-violet-50 text-violet-800 ring-violet-700/20",
};

const fulfillmentClasses: Record<string, string> = {
  PROCESSING: "bg-amber-50 text-amber-800 ring-amber-700/20",
  SHIPPED: "bg-sky-50 text-sky-800 ring-sky-700/20",
  DELIVERED: "bg-emerald-50 text-emerald-800 ring-emerald-700/20",
  CANCELLED: "bg-rose-50 text-rose-800 ring-rose-700/20",
};

export function OrderStatusBadge({
  status,
  kind,
}: {
  status: string | null;
  kind: "payment" | "fulfillment";
}) {
  const normalized = status?.toUpperCase() ?? "";
  const classes =
    (kind === "payment" ? paymentClasses : fulfillmentClasses)[normalized] ??
    "bg-stone-100 text-stone-700 ring-stone-600/15";

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[.68rem] font-bold uppercase tracking-wide ring-1 ring-inset ${classes}`}
    >
      {status ? normalized.replaceAll("_", " ") : "UNFULFILLED"}
    </span>
  );
}
