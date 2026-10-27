"use client";

import { FormEvent, useCallback, useRef, useState } from "react";
import { useCart } from "@/components/CartProvider";
import { useToast } from "@/components/ToastProvider";
import { CHECKOUT_CURRENCY } from "@/lib/checkout/constants";
import { trackGenerateLead, type GaLeadSource } from "@/lib/ga-events";
import {
  useCustomerProfileAutofill,
  type CustomerProfile,
} from "@/components/CustomerProfileProvider";

export function ContactForm() {
  const { showToast } = useToast();
  const { items: cartItems } = useCart();
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);
  const hasTrackedSubmissionRef = useRef(false);
  const resolveContactFields = useCallback(
    (profile: CustomerProfile) => ({
      name: [profile.firstName, profile.lastName].filter(Boolean).join(" ") || profile.name || "",
      email: profile.email,
    }),
    [],
  );
  const {
    formRef,
    onChange,
    status: profileStatus,
  } = useCustomerProfileAutofill(resolveContactFields);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    hasTrackedSubmissionRef.current = false;
    setError("");
    setIsSubmitting(true);

    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.get("name"),
          email: formData.get("email"),
          message: formData.get("message"),
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        setError(body?.error || "Unable to send your message.");
        return;
      }

      if (!hasTrackedSubmissionRef.current) {
        hasTrackedSubmissionRef.current = true;
        const source = leadSourceFromHash(window.location.hash);
        if (source === "contact") {
          trackGenerateLead(source);
        } else {
          trackGenerateLead(
            source,
            cartItems.map((item) => ({
              itemId: item.sku,
              itemName: item.name,
              itemVariant: item.variantLabel,
              priceCents: item.priceCents,
              quantity: item.quantity,
            })),
            CHECKOUT_CURRENCY,
          );
        }
      }

      form.reset();
      showToast("Message sent. We'll be in touch.");
    } catch {
      setError("Unable to send your message. Please try again.");
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  }

  function leadSourceFromHash(hash: string): GaLeadSource {
    if (hash === "#lead-source=cart") return "cart";
    if (hash === "#lead-source=buy_now") return "buy_now";
    return "contact";
  }

  return (
    <form className="grid max-w-xl gap-5" onChange={onChange} onSubmit={handleSubmit} ref={formRef}>
      <label className="grid gap-2 text-[.7rem] font-bold uppercase tracking-[.12em]">
        Name
        <input className="auth-input" name="name" required autoComplete="name" />
      </label>
      <label className="grid gap-2 text-[.7rem] font-bold uppercase tracking-[.12em]">
        Email
        <input className="auth-input" name="email" type="email" required autoComplete="email" />
      </label>
      <label className="grid gap-2 text-[.7rem] font-bold uppercase tracking-[.12em]">
        Message
        <textarea className="auth-input min-h-36 resize-y" name="message" required />
      </label>
      {profileStatus === "error" && (
        <p className="text-sm text-muted" role="status">
          Saved details could not be loaded. You can still enter your details manually.
        </p>
      )}
      {error && <p className="text-sm text-[#e89b87]">{error}</p>}
      <button
        className="auth-button transition-[background-color,transform] duration-300 hover:-translate-y-0.5 active:translate-y-0 motion-reduce:transform-none motion-reduce:transition-colors"
        type="submit"
        disabled={isSubmitting}
      >
        {isSubmitting ? "Sending message..." : "Send message"}
      </button>
    </form>
  );
}
