"use client";

import { useState, type FormEvent } from "react";

export function PasswordChangeForm() {
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setMessage("");
    setIsSaving(true);
    try {
      const response = await fetch("/api/profile/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: data.get("currentPassword"),
          newPassword: data.get("newPassword"),
        }),
      });
      const result: unknown = await response.json();
      if (!response.ok) {
        const error =
          result && typeof result === "object" && "error" in result && typeof result.error === "string"
            ? result.error
            : "Unable to update your password.";
        throw new Error(error);
      }
      form.reset();
      setMessage("Password updated.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to update your password.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form className="mt-4 grid max-w-xl gap-4" onSubmit={submit}>
      <label className="grid gap-2 text-[.65rem] font-bold uppercase tracking-[.1em]">
        Current password
        <input
          autoComplete="current-password"
          className="auth-input"
          name="currentPassword"
          required
          type="password"
        />
      </label>
      <label className="grid gap-2 text-[.65rem] font-bold uppercase tracking-[.1em]">
        New password
        <input
          autoComplete="new-password"
          className="auth-input"
          minLength={8}
          name="newPassword"
          required
          type="password"
        />
      </label>
      <button
        className="min-h-11 w-fit bg-ink px-4 text-[.65rem] font-bold uppercase tracking-[.08em] text-paper disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#65771b]"
        disabled={isSaving}
        type="submit"
      >
        {isSaving ? "Updating..." : "Update password"}
      </button>
      {message && (
        <p className="text-sm text-[#55584e]" role="status" aria-live="polite">
          {message}
        </p>
      )}
    </form>
  );
}
