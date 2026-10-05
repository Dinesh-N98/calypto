"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useCart } from "@/components/CartProvider";
import { Reveal } from "@/components/Reveal";

type PaymentStatus = "pending" | "paid" | "cancelled" | "failed";

function isPaymentStatus(value: unknown): value is PaymentStatus {
  return value === "pending" || value === "paid" || value === "cancelled" || value === "failed";
}

export function CheckoutResult() {
  const searchParams = useSearchParams();
  const reference = searchParams.get("order");
  const { clearCart } = useCart();
  const [status, setStatus] = useState<PaymentStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [checkAgain, setCheckAgain] = useState(0);

  const checkStatus = useCallback(async (): Promise<PaymentStatus | null> => {
    if (!reference) {
      setError("An order reference was not provided, so payment status cannot be checked.");
      return null;
    }

    setIsChecking(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/checkout/status?reference=${encodeURIComponent(reference)}`,
        { cache: "no-store" },
      );
      const result: unknown = await response.json();
      if (!response.ok) {
        const message =
          result &&
          typeof result === "object" &&
          "error" in result &&
          typeof result.error === "string"
            ? result.error
            : "Unable to verify payment status right now.";
        throw new Error(message);
      }
      const nextStatus =
        result && typeof result === "object" && "status" in result ? result.status : null;
      if (!isPaymentStatus(nextStatus))
        throw new Error("The server returned an invalid order status.");

      setStatus(nextStatus);
      if (nextStatus === "paid") clearCart();
      return nextStatus;
    } catch (statusError) {
      setError(
        statusError instanceof Error
          ? statusError.message
          : "Unable to verify payment status right now.",
      );
      return null;
    } finally {
      setIsChecking(false);
    }
  }, [clearCart, reference]);

  useEffect(() => {
    if (!reference) return;

    let active = true;
    let timeout: ReturnType<typeof setTimeout>;
    let attempts = 0;

    async function refresh() {
      const nextStatus = await checkStatus();
      if (!active) return;
      if ((nextStatus === "pending" || nextStatus === null) && attempts < 11) {
        attempts += 1;
        timeout = setTimeout(refresh, 5000);
      }
    }

    void refresh();
    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [checkAgain, checkStatus, reference]);

  const heading = !reference
    ? "unavailable."
    : status === "paid"
      ? "succeeded."
      : status === "cancelled"
        ? "cancelled."
        : status === "failed"
          ? "failed."
          : status === "pending"
            ? "pending."
            : "checking.";
  const description = !reference
    ? "The payment status cannot be checked without an order reference."
    : status === "paid"
      ? "OnePay has verified your payment. Your order is confirmed."
      : status === "cancelled"
        ? "OnePay confirmed that this payment was cancelled."
        : status === "failed"
          ? "OnePay confirmed that this payment failed."
          : status === "pending"
            ? "OnePay has not confirmed payment yet. This page will keep checking; your order is not marked paid."
            : "Your order will only be confirmed after its payment status is verified with OnePay.";

  return (
    <Reveal as="section" className="mx-auto max-w-3xl border-t border-ink pt-8">
      <p className="text-[.6rem] font-bold uppercase tracking-[.15em] text-[#65771b]">
        {status === "paid" ? "Payment confirmed" : "Payment status"}
      </p>
      <h1 className="my-4 text-[clamp(2.65rem,9vw,3.8rem)] font-black uppercase leading-[.92] tracking-[-.07em] md:my-5 md:text-[clamp(3.5rem,6vw,6rem)]">
        Order
        <br />
        <em className="text-[#829b22] not-italic">{heading}</em>
      </h1>
      <p className="max-w-lg leading-[1.7] text-[#55584e]">{description}</p>
      {reference && <p className="mt-5 text-xs text-[#55584e]">Order reference: {reference}</p>}
      {(error ||
        (!reference &&
          "An order reference was not provided, so payment status cannot be checked.")) && (
        <p className="mt-4 text-sm text-red-700">
          {error || "An order reference was not provided, so payment status cannot be checked."}
        </p>
      )}
      {status !== "paid" && reference && (
        <button
          className="mt-5 text-[.65rem] font-bold uppercase tracking-[.1em] text-[#65771b] disabled:opacity-60"
          disabled={isChecking}
          onClick={() => {
            setError(null);
            setCheckAgain((value) => value + 1);
          }}
          type="button"
        >
          {isChecking ? "Checking..." : "Check payment status"}
        </button>
      )}
      <Link
        className="button-primary mt-8 inline-flex items-center justify-center gap-3 px-5 py-4 text-[.7rem] tracking-[.1em] text-paper"
        href="/shop"
      >
        Keep fishing{" "}
        <ArrowUpRight aria-hidden="true" className="h-4 w-4 shrink-0" strokeWidth={2} />
      </Link>
    </Reveal>
  );
}
