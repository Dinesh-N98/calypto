function ProductGridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 px-[7vw] py-16 md:grid-cols-3 md:gap-6 md:px-[10vw] md:py-24 lg:grid-cols-4">
      {Array.from({ length: 8 }, (_, index) => (
        <div key={index} className="animate-pulse overflow-hidden bg-[#e4e4d9]">
          <div className="aspect-[1/1.1] bg-[#c9c9c0]" />
          <div className="grid gap-3 p-5">
            <div className="h-3 w-1/2 bg-[#c9c9c0]" />
            <div className="h-5 w-4/5 bg-[#c9c9c0]" />
            <div className="h-4 w-1/4 bg-[#c9c9c0]" />
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
