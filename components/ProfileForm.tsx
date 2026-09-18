"use client";

import { FormEvent, useState } from "react";

export function ProfileForm({ address, phone }: { address: string; phone: string }) {
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setMessage("");
    const formData = new FormData(event.currentTarget);
    const response = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address: formData.get("address"), phone: formData.get("phone") }),
    });
    setMessage(response.ok ? "Profile saved." : "Unable to save your profile.");
    setIsSaving(false);
  }

  return (
    <form className="grid gap-5" onSubmit={handleSubmit}>
      <label className="grid gap-2 text-[.7rem] font-bold uppercase tracking-[.12em]">
        Address
        <textarea className="auth-input min-h-28 resize-y" name="address" defaultValue={address} />
      </label>
      <label className="grid gap-2 text-[.7rem] font-bold uppercase tracking-[.12em]">
        Phone
        <input className="auth-input" name="phone" type="tel" defaultValue={phone} autoComplete="tel" />
      </label>
      <div className="flex items-center gap-4">
        <button className="auth-button" type="submit" disabled={isSaving}>
          {isSaving ? "Saving..." : "Save profile"}
        </button>
        {message && <p className="text-sm text-muted">{message}</p>}
      </div>
    </form>
  );
}