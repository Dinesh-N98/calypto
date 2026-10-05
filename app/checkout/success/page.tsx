import { Suspense } from "react";
import { CheckoutResult } from "@/components/CheckoutResult";

export default function CheckoutSuccessPage() {
  return (
    <main className="bg-paper px-[7vw] py-16 text-ink md:px-[10vw] md:py-20">
      <Suspense>
        <CheckoutResult />
      </Suspense>
    </main>
  );
}
