"use client";

import { FormEvent, useCallback, useState } from "react";
import { useToast } from "@/components/ToastProvider";
import {
  useCustomerProfileAutofill,
  type CustomerProfile,
} from "@/components/CustomerProfileProvider";

export function WholesaleForm() {
  const { showToast } = useToast();
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const resolveWholesaleFields = useCallback(
    (profile: CustomerProfile) => ({
      name: [profile.firstName, profile.lastName].filter(Boolean).join(" ") || profile.name || "",
      email: profile.email,
      phone: profile.phone,
    }),
    [],
  );
  const {
    formRef,
    onChange,
    status: profileStatus,
  } = useCustomerProfileAutofill(resolveWholesaleFields);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      const response = await fetch("/api/wholesale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName: formData.get("businessName"),
          name: formData.get("name"),
          email: formData.get("email"),
          phone: formData.get("phone"),
          message: formData.get("message"),
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        setError(body?.error || "Unable to send your wholesale inquiry.");
        return;
      }

      form.reset();
      showToast("Wholesale inquiry sent. We'll be in touch.");
    } catch {
      setError("Unable to send your wholesale inquiry. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="grid max-w-xl gap-5" onChange={onChange} onSubmit={handleSubmit} ref={formRef}>
      <label className="grid gap-2 text-[.7rem] font-bold uppercase tracking-[.12em]">
        Business / Shop name
        <input className="auth-input" name="businessName" required autoComplete="organization" />
      </label>
      <label className="grid gap-2 text-[.7rem] font-bold uppercase tracking-[.12em]">
        Contact name
        <input className="auth-input" name="name" required autoComplete="name" />
      </label>
      <label className="grid gap-2 text-[.7rem] font-bold uppercase tracking-[.12em]">
        Email
        <input className="auth-input" name="email" type="email" required autoComplete="email" />
      </label>
      <label className="grid gap-2 text-[.7rem] font-bold uppercase tracking-[.12em]">
        Phone (optional)
        <input className="auth-input" name="phone" type="tel" autoComplete="tel" />
      </label>
      <label className="grid gap-2 text-[.7rem] font-bold uppercase tracking-[.12em]">
        Message / details
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
        {isSubmitting ? "Sending inquiry..." : "Send inquiry"}
      </button>
    </form>
  );
}
