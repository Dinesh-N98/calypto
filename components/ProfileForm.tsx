"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useCustomerProfile } from "@/components/CustomerProfileProvider";

export function ProfileForm({
  firstName,
  lastName,
  address,
  phone,
}: {
  firstName: string;
  lastName: string;
  address: string;
  phone: string;
}) {
  const { updateProfile } = useCustomerProfile();
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setMessage("");
    const formData = new FormData(event.currentTarget);
    const firstNameValue = formData.get("firstName");
    const lastNameValue = formData.get("lastName");
    const addressValue = formData.get("address");
    const phoneValue = formData.get("phone");

    try {
      if (
        typeof firstNameValue !== "string" ||
        typeof lastNameValue !== "string" ||
        typeof addressValue !== "string" ||
        typeof phoneValue !== "string"
      ) {
        throw new Error("Profile fields are invalid.");
      }
      await updateProfile({
        firstName: firstNameValue,
        lastName: lastNameValue,
        address: addressValue,
        phone: phoneValue,
      });
      setMessage("Profile saved.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save your profile.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form
      className="box-border grid w-full max-w-full gap-4 px-4 sm:grid-cols-2 sm:px-0"
      onSubmit={handleSubmit}
    >
      <label className="grid w-full min-w-0 gap-2 text-[.7rem] font-bold uppercase tracking-[.12em]">
        First name
        <input
          autoComplete="given-name"
          className="auth-input"
          maxLength={100}
          name="firstName"
          defaultValue={firstName}
        />
      </label>
      <label className="grid w-full min-w-0 gap-2 text-[.7rem] font-bold uppercase tracking-[.12em]">
        Last name
        <input
          autoComplete="family-name"
          className="auth-input"
          maxLength={100}
          name="lastName"
          defaultValue={lastName}
        />
      </label>
      <label className="grid w-full min-w-0 gap-2 text-[.7rem] font-bold uppercase tracking-[.12em] sm:col-span-2">
        Address
        <textarea
          className="auth-input min-h-28 resize-y"
          maxLength={500}
          name="address"
          defaultValue={address}
        />
      </label>
      <label className="grid w-full min-w-0 gap-2 text-[.7rem] font-bold uppercase tracking-[.12em]">
        Phone
        <input
          autoComplete="tel"
          className="auth-input"
          maxLength={50}
          name="phone"
          type="tel"
          defaultValue={phone}
        />
      </label>
      <div className="flex flex-wrap items-center gap-4 sm:col-span-2">
        <button className="auth-button" type="submit" disabled={isSaving}>
          {isSaving ? "Saving..." : "Save profile"}
        </button>
        <p className="min-h-5 text-sm text-muted" role="status" aria-live="polite" aria-atomic="true">
          {message}
        </p>
      </div>
    </form>
  );
}
