"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { CheckoutPayload } from "@/lib/checkout/types";

type PayPalButtonActions = {
  order: { capture: () => Promise<unknown> };
};

type PayPalNamespace = {
  Buttons: (options: {
    createOrder: () => Promise<string>;
    onApprove: (data: { orderID: string }, actions: PayPalButtonActions) => Promise<void>;
    onCancel: () => void;
    onError: (error: unknown) => void;
  }) => {
    render: (container: HTMLElement) => Promise<void>;
  };
};

declare global {
  interface Window {
    paypal?: PayPalNamespace;
  }
}

export function PayPalCheckoutButtons({
  clientId,
  createPayload,
}: {
  clientId: string;
  createPayload: () => CheckoutPayload | null;
}) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const idempotencyKey = useRef<string | null>(null);
  const payloadFingerprint = useRef<string | null>(null);
  const [sdkReady, setSdkReady] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!clientId || !container) return;
    let active = true;
    const renderButtons = async () => {
      if (!active || !window.paypal) return;
      try {
        await window.paypal
          .Buttons({
            createOrder: async () => {
              const payload = createPayload();
              if (!payload) throw new Error("Complete the checkout details before continuing.");
              setMessage(null);
              setIsProcessing(true);
              const fingerprint = JSON.stringify(payload);
              if (payloadFingerprint.current !== fingerprint) {
                payloadFingerprint.current = fingerprint;
                idempotencyKey.current = null;
              }
              idempotencyKey.current ??= window.crypto.randomUUID();
              const response = await fetch("/api/checkout/paypal/orders", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "Idempotency-Key": idempotencyKey.current,
                },
                body: JSON.stringify(payload),
              });
              const result: unknown = await response.json();
              if (
                !response.ok ||
                !result ||
                typeof result !== "object" ||
                !("id" in result) ||
                typeof result.id !== "string"
              ) {
                const error =
                  result &&
                  typeof result === "object" &&
                  "error" in result &&
                  typeof result.error === "string"
                    ? result.error
                    : "Unable to start PayPal checkout.";
                throw new Error(error);
              }
              return result.id;
            },
            onApprove: async (data) => {
              setIsProcessing(true);
              setMessage("Confirming your payment securely...");
              const response = await fetch(
                `/api/checkout/paypal/orders/${encodeURIComponent(data.orderID)}/capture`,
                { method: "POST" },
              );
              const result: unknown = await response.json();
              if (
                !response.ok ||
                !result ||
                typeof result !== "object" ||
                !("status" in result) ||
                result.status !== "paid" ||
                !("orderReference" in result) ||
                typeof result.orderReference !== "string"
              ) {
                const error =
                  result &&
                  typeof result === "object" &&
                  "error" in result &&
                  typeof result.error === "string"
                    ? result.error
                    : "Payment is being verified. Please check your order status shortly.";
                throw new Error(error);
              }
              router.push(
                `/checkout/success?order=${encodeURIComponent(result.orderReference)}`,
              );
            },
            onCancel: () => {
              setIsProcessing(false);
              setMessage("Checkout canceled. Your cart is unchanged; you can try again or choose OnePay.");
            },
            onError: (error) => {
              console.error("PayPal checkout failed.", error);
              setIsProcessing(false);
              setMessage(
                error instanceof Error
                  ? error.message
                  : "PayPal could not complete checkout. Please try again or choose OnePay.",
              );
            },
          })
          .render(container);
        if (active) setSdkReady(true);
      } catch (error) {
        if (!active) return;
        console.error("Unable to render PayPal checkout buttons.", error);
        setMessage("PayPal is temporarily unavailable. Please try again or choose OnePay.");
      }
    };

    if (window.paypal) {
      void renderButtons();
    } else {
      const existing = document.querySelector<HTMLScriptElement>(
        'script[data-calypto-paypal-sdk="true"]',
      );
      const script =
        existing ??
        Object.assign(document.createElement("script"), {
          src: `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&currency=USD&intent=capture&components=buttons`,
          async: true,
          dataset: { calyptoPaypalSdk: "true" },
        });
      const onLoad = () => void renderButtons();
      const onError = () => {
        if (active) setMessage("PayPal could not load. Please try again or choose OnePay.");
      };
      script.addEventListener("load", onLoad);
      script.addEventListener("error", onError);
      if (!existing) document.head.appendChild(script);
      return () => {
        active = false;
        script.removeEventListener("load", onLoad);
        script.removeEventListener("error", onError);
        container.replaceChildren();
      };
    }

    return () => {
      active = false;
      container.replaceChildren();
    };
  }, [clientId, createPayload, router]);

  return (
    <div className="grid gap-3">
      <div aria-busy={isProcessing || !sdkReady} ref={containerRef} />
      {(!sdkReady || isProcessing) && !message && (
        <p className="text-sm text-[#55584e]" role="status">
          {isProcessing ? "Processing PayPal checkout..." : "Loading PayPal..."}
        </p>
      )}
      {message && (
        <p className="text-sm text-red-700" role="alert">
          {message}
        </p>
      )}
    </div>
  );
}
