function ProductGridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-2 px-[7vw] py-16 md:grid-cols-3 md:gap-3 md:px-[10vw] md:py-24 lg:grid-cols-4">
      {Array.from({ length: 8 }, (_, index) => (
        <div key={index} className="animate-pulse overflow-hidden bg-[#e4e4d9]">
          <div className="aspect-square bg-[#c9c9c0]" />
          <div className="grid gap-1 p-2.5">
            <div className="h-4 w-4/5 bg-[#c9c9c0]" />
            <div className="h-3 w-1/4 bg-[#c9c9c0]" />
            <div className="h-7 w-full bg-[#c9c9c0]" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Loading() {
  return (
    <main className="min-h-screen bg-ink">
      <ProductGridSkeleton />
    </main>
  );
}
