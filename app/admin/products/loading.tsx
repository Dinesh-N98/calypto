function ProductTableSkeletonRow() {
  return (
    <tr className="animate-pulse border-t border-black/5">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 shrink-0 rounded-md bg-[#e6e8e1]" />
          <div className="grid flex-1 gap-2">
            <div className="h-3 w-36 max-w-full rounded bg-[#e6e8e1]" />
            <div className="h-2.5 w-24 rounded bg-[#eef0eb]" />
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="h-6 w-24 rounded-full bg-[#eef0eb]" />
      </td>
      <td className="px-4 py-3">
        <div className="ml-auto h-3 w-14 rounded bg-[#e6e8e1]" />
      </td>
      <td className="px-4 py-3">
        <div className="ml-auto h-9 w-28 rounded bg-[#eef0eb]" />
      </td>
    </tr>
  );
}

export default function Loading() {
  return (
    <div aria-label="Loading products" aria-busy="true" className="space-y-6">
      <header className="space-y-3">
        <div className="h-3 w-24 animate-pulse rounded bg-[#e6e8e1]" />
        <div className="h-9 w-48 animate-pulse rounded bg-[#e6e8e1]" />
        <div className="h-4 w-72 max-w-full animate-pulse rounded bg-[#eef0eb]" />
      </header>
      <section className="overflow-hidden rounded-lg border border-black/10 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-black/10 p-4 sm:flex-row sm:justify-between">
          <div className="h-10 w-full animate-pulse rounded bg-[#eef0eb] sm:max-w-sm" />
          <div className="h-10 w-52 animate-pulse rounded bg-[#eef0eb]" />
        </div>
        <div className="overflow-hidden">
          <table aria-hidden="true" className="w-full min-w-[760px]">
            <thead className="bg-[#f7f8f5]">
              <tr>
                <th className="px-4 py-3 text-left text-[.65rem] font-bold uppercase text-[#73786b]">
                  Product
                </th>
                <th className="px-4 py-3 text-left text-[.65rem] font-bold uppercase text-[#73786b]">
                  Category
                </th>
                <th className="px-4 py-3 text-right text-[.65rem] font-bold uppercase text-[#73786b]">
                  Price
                </th>
                <th className="px-4 py-3 text-right text-[.65rem] font-bold uppercase text-[#73786b]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 8 }, (_, index) => (
                <ProductTableSkeletonRow key={index} />
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
