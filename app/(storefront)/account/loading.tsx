export default function AccountLoading() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading your account"
      className="animate-pulse motion-reduce:animate-none"
      role="status"
    >
      <span className="sr-only">Loading your account</span>
      <div className="h-3 w-28 bg-ink/10" />
      <div className="mt-4 h-10 max-w-lg bg-ink/10" />
      <div className="mt-3 h-4 max-w-md bg-ink/10" />
      <div className="mt-8 h-32 bg-ink/10" />
      <div className="mt-8 h-8 w-40 bg-ink/10" />
      <div className="mt-4 grid gap-3">
        <div className="h-16 bg-ink/10" />
        <div className="h-16 bg-ink/10" />
        <div className="h-16 bg-ink/10" />
      </div>
    </div>
  );
}
