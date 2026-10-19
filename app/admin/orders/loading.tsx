export default function AdminOrdersLoading() {
  return (
    <section aria-label="Loading orders" aria-busy="true" className="space-y-6">
      <div className="h-20 animate-pulse rounded-xl bg-stone-200" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map((card) => (
          <div className="h-28 animate-pulse rounded-xl bg-stone-200" key={card} />
        ))}
      </div>
      <div className="h-20 animate-pulse rounded-xl bg-stone-200" />
      <div className="h-96 animate-pulse rounded-xl bg-stone-200" />
    </section>
  );
}
