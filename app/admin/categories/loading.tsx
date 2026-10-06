function CategoryTableSkeletonRow() {
  return (
    <tr className="animate-pulse border-t border-black/5">
      <td className="px-4 py-3">
        <div className="h-3 w-36 max-w-full rounded bg-[#e6e8e1]" />
      </td>
      <td className="px-4 py-3">
        <div className="h-6 w-28 rounded bg-[#eef0eb]" />
      </td>
      <td className="px-4 py-3">
        <div className="h-6 w-20 rounded-full bg-[#eef0eb]" />
      </td>
      <td className="px-4 py-3">
        <div className="h-6 w-24 rounded-full bg-[#eef0eb]" />
      </td>
      <td className="px-4 py-3">
        <div className="ml-auto h-9 w-28 rounded bg-[#eef0eb]" />
      </td>
    </tr>
  );
}

export default function Loading() {
  return (
    <div aria-label="Loading categories" aria-busy="true" className="space-y-6">
      <header className="space-y-3">
        <div className="h-3 w-24 animate-pulse rounded bg-[#e6e8e1]" />
        <div className="h-9 w-48 animate-pulse rounded bg-[#e6e8e1]" />
        <div className="h-4 w-72 max-w-full animate-pulse rounded bg-[#eef0eb]" />
      </header>
      <section className="overflow-hidden rounded-lg border border-black/10 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-black/10 p-4 sm:flex-row sm:justify-between">
          <div className="h-10 w-full animate-pulse rounded bg-[#eef0eb] sm:max-w-sm" />
          <div className="h-4 w-40 animate-pulse rounded bg-[#eef0eb]" />
        </div>
        <div className="overflow-x-auto">
          <table aria-hidden="true" className="w-full min-w-[850px]">
            <thead className="bg-[#f7f8f5]">
              <tr>
                <th className="px-4 py-3 text-left text-[.65rem] font-bold uppercase text-[#73786b]">
                  Category name
                </th>
                <th className="px-4 py-3 text-left text-[.65rem] font-bold uppercase text-[#73786b]">
                  URL slug
                </th>
                <th className="px-4 py-3 text-left text-[.65rem] font-bold uppercase text-[#73786b]">
                  Linked products
                </th>
                <th className="px-4 py-3 text-left text-[.65rem] font-bold uppercase text-[#73786b]">
                  Constraint status
                </th>
                <th className="px-4 py-3 text-right text-[.65rem] font-bold uppercase text-[#73786b]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 8 }, (_, index) => (
                <CategoryTableSkeletonRow key={index} />
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
