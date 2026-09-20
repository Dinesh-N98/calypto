"use client";

import { FormEvent, useState } from "react";
import { useToast } from "@/components/ToastProvider";

export function ContactForm() {
  const { showToast } = useToast();
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
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

      form.reset();
      showToast("Message sent — we'll be in touch");
    } catch {
      setError("Unable to send your message. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="grid max-w-xl gap-5" onSubmit={handleSubmit}>
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
      {error && <p className="text-sm text-[#e89b87]">{error}</p>}
      <button className="auth-button" type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Sending message..." : "Send message"}
      </button>
    </form>
  );
}