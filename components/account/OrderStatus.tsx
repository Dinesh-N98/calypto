export function OrderStatus({ value }: { value: string }) {
  const normalized = value.toUpperCase();
  const statusStyles: Record<string, string> = {
    FAILED: "border-ink bg-paper text-ink",
    PENDING: "border-ink/20 bg-white/60 text-ink",
    PROCESSING: "border-ink/20 bg-paper text-ink",
    PAID: "border-lime bg-lime/20 text-ink",
    SHIPPED: "border-lime bg-lime/20 text-ink",
    DELIVERED: "border-ink bg-ink text-paper",
    CANCELLED: "border-ink/20 bg-white/60 text-muted",
  };

  return (
    <span
      className={`inline-flex min-h-7 shrink-0 items-center border px-2.5 text-[.6rem] font-bold uppercase tracking-[.08em] ${
        statusStyles[normalized] ?? "border-ink/20 bg-white/60 text-ink"
      }`}
    >
      {value}
    </span>
  );
}
