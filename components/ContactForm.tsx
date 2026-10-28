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
import {
  NEWSLETTER_DISCOUNT_CODE_PATTERN,
  normalizeNewsletterDiscountCode,
} from "@/lib/newsletter/discount-redemption";

export function ContactForm({ initialDiscountCode = "" }: { initialDiscountCode?: string }) {
  const { showToast } = useToast();
  const { items: cartItems } = useCart();
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [discountCode, setDiscountCode] = useState(initialDiscountCode);
  const invalidDiscountCode =
    Boolean(discountCode.trim()) && !normalizeNewsletterDiscountCode(discountCode);
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
    const rawDiscountCode = String(formData.get("discountCode") ?? "").trim();
    const normalizedDiscountCode = rawDiscountCode
      ? normalizeNewsletterDiscountCode(rawDiscountCode)
      : null;
    if (rawDiscountCode && !normalizedDiscountCode) {
      setError("Enter a valid discount code in the format CREW-XXXXXXXX.");
      isSubmittingRef.current = false;
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.get("name"),
          email: formData.get("email"),
          message: formData.get("message"),
          ...(normalizedDiscountCode ? { discountCode: normalizedDiscountCode } : {}),
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

      const body = (await response.json()) as { message?: string };
      form.reset();
      setDiscountCode("");
      showToast(body.message || "Message sent. We'll be in touch.");
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
      <label className="grid gap-2 text-[.7rem] font-bold uppercase tracking-[.12em]">
        Discount code (optional)
        <input
          aria-invalid={invalidDiscountCode}
          autoComplete="off"
          className="auth-input uppercase"
          maxLength={13}
          name="discountCode"
          onChange={(event) => setDiscountCode(event.currentTarget.value.toUpperCase())}
          pattern={NEWSLETTER_DISCOUNT_CODE_PATTERN.source}
          placeholder="CREW-XXXXXXXX"
          type="text"
          value={discountCode}
          onInvalid={(event) => {
            if (invalidDiscountCode) {
              event.preventDefault();
              setError("Enter a valid discount code in the format CREW-XXXXXXXX.");
            }
          }}
        />
        <span className="normal-case tracking-normal text-muted">
          We&apos;ll verify your code and apply it to your order. The code must match the subscriber
          email used here. It applies to product subtotal only, not shipping or tax.
        </span>
      </label>
      {profileStatus === "error" && (
        <p className="text-sm text-muted" role="status">
          Saved details could not be loaded. You can still enter your details manually.
        </p>
      )}
      {error && (
        <p aria-live="polite" className="text-sm text-[#e89b87]" role="alert">
          {error}
        </p>
      )}
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
