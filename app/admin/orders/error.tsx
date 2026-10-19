"use client";

import { useEffect } from "react";

export default function AdminOrdersError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Admin orders page failed to load.", error);
  }, [error]);

  return (
    <section
      aria-labelledby="admin-orders-error-title"
      className="rounded-xl border border-rose-200 bg-white p-6"
    >
      <h1 className="text-xl font-black" id="admin-orders-error-title">
        Orders could not be loaded
      </h1>
      <p className="mt-2 text-sm text-[#65695f]">
        Please try again. If the problem continues, contact your administrator.
      </p>
      <button
        className="mt-5 min-h-10 rounded-lg bg-[#171a14] px-4 text-sm font-semibold text-white"
        onClick={reset}
        type="button"
      >
        Try again
      </button>
    </section>
  );
}
