"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function SignInForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    const formData = new FormData(event.currentTarget);
    const result = await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirect: false,
    });

    if (result?.error) {
      setError("That email and password combination was not recognized.");
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
          Email
          <input className="auth-input" name="email" type="email" required autoComplete="email" />
        </label>
        <label className="grid gap-2 text-[.7rem] font-bold uppercase tracking-[.12em]">
          Password
          <input
            className="auth-input"
            name="password"
            type="password"
            required
            autoComplete="current-password"
          />
        </label>
        {error && <p className="text-sm text-[#e89b87]">{error}</p>}
        <button className="auth-button" type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Signing in..." : "Sign In"}
        </button>
      </form>
      <div className="my-7 flex items-center gap-4 text-[.65rem] font-bold uppercase tracking-[.14em] text-muted">
        <span className="h-px flex-1 bg-[rgba(241,240,232,.18)]" />
        or
        <span className="h-px flex-1 bg-[rgba(241,240,232,.18)]" />
      </div>
      <button className="auth-button-secondary w-full" onClick={() => signIn("google", { callbackUrl: "/account" })}>
        Continue with Google
      </button>
      <p className="mt-8 text-sm text-muted">
        New to Calypto? <Link className="text-lime underline" href="/sign-up">Create an account</Link>
      </p>
    </div>
  );
}