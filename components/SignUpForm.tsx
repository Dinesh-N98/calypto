"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function SignUpForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    const form = event.currentTarget;
    const formData = new FormData(form);
    const response = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: formData.get("name"),
        email: formData.get("email"),
        password: formData.get("password"),
      }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setError(body?.error || "Unable to create your account.");
      setIsSubmitting(false);
      return;
    }

    const result = await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirect: false,
    });
    if (result?.error) {
      setError("Your account was created. Please sign in to continue.");
      setIsSubmitting(false);
      return;
    }
    router.push("/account");
    router.refresh();
  }

  return (
    <div className="max-w-xl">
      <form className="grid gap-5" onSubmit={handleSubmit}>
        <label className="grid gap-2 text-[.7rem] font-bold uppercase tracking-[.12em]">
          Name
          <input className="auth-input" name="name" required autoComplete="name" />
        </label>
        <label className="grid gap-2 text-[.7rem] font-bold uppercase tracking-[.12em]">
          Email
          <input className="auth-input" name="email" type="email" required autoComplete="email" />
        </label>
        <label className="grid gap-2 text-[.7rem] font-bold uppercase tracking-[.12em]">
          Password
          <input className="auth-input" name="password" type="password" required minLength={8} autoComplete="new-password" />
        </label>
        {error && <p className="text-sm text-[#e89b87]">{error}</p>}
        <button className="auth-button" type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Creating account..." : "Create account"}
        </button>
      </form>
      <p className="mt-8 text-sm text-muted">
        Already have an account? <Link className="text-lime underline" href="/sign-in">Sign in</Link>
      </p>
    </div>
  );
}