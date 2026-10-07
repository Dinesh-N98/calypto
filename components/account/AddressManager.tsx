"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { CustomerAddress } from "@/components/CustomerProfileProvider";

type AddressFields = Omit<CustomerAddress, "id" | "isDefault">;
type AddressAction =
  | { action: "create"; line1: string; line2: string; city: string; postalCode: string; country: string }
  | { action: "update"; id: string; line1: string; line2: string; city: string; postalCode: string; country: string }
  | { action: "delete"; id: string }
  | { action: "default"; id: string };

const emptyAddress: AddressFields = {
  line1: "",
  line2: "",
  city: "",
  postalCode: "",
  country: "",
};

export function AddressManager({ initialAddresses }: { initialAddresses: CustomerAddress[] }) {
  const [addresses, setAddresses] = useState(initialAddresses);
  const [formValues, setFormValues] = useState<AddressFields>(emptyAddress);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const router = useRouter();

  async function saveAction(action: AddressAction, optimistic: CustomerAddress[]) {
    const previous = addresses;
    setAddresses(optimistic);
    setIsSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ addresses: action }),
      });
      const result: unknown = await response.json();
      if (
        !response.ok ||
        !result ||
        typeof result !== "object" ||
        !("addresses" in result) ||
        !Array.isArray(result.addresses)
      ) {
        const error =
          result && typeof result === "object" && "error" in result && typeof result.error === "string"
            ? result.error
            : "Unable to save your address.";
        throw new Error(error);
      }
      setAddresses(result.addresses as CustomerAddress[]);
      setMessage("Address changes saved.");
      router.refresh();
    } catch (error) {
      setAddresses(previous);
      setMessage(error instanceof Error ? error.message : "Unable to save your address.");
    } finally {
      setIsSaving(false);
    }
  }

  function submitAddress(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = {
      line1: formValues.line1.trim(),
      line2: formValues.line2?.trim() ?? "",
      city: formValues.city.trim(),
      postalCode: formValues.postalCode.trim(),
      country: formValues.country.trim(),
    };
    if (editingId) {
      const next = addresses.map((address) =>
        address.id === editingId ? { ...address, ...values } : address,
      );
      void saveAction({ action: "update", id: editingId, ...values }, next);
    } else {
      const temporaryAddress: CustomerAddress = {
        id: `pending-${Date.now()}`,
        ...values,
        isDefault: addresses.length === 0,
      };
      void saveAction({ action: "create", ...values }, [...addresses, temporaryAddress]);
    }
    setEditingId(null);
    setFormValues(emptyAddress);
  }

  function beginEdit(address: CustomerAddress) {
    setEditingId(address.id);
    setFormValues({
      line1: address.line1,
      line2: address.line2 ?? "",
      city: address.city,
      postalCode: address.postalCode,
      country: address.country,
    });
    setMessage("");
  }

  function deleteAddress(address: CustomerAddress) {
    const remaining = addresses.filter((entry) => entry.id !== address.id);
    const next = address.isDefault && remaining.length > 0
      ? remaining.map((entry, index) => ({ ...entry, isDefault: index === 0 }))
      : remaining;
    void saveAction({ action: "delete", id: address.id }, next);
  }

  return (
    <div className="grid gap-8">
      <section aria-labelledby="saved-addresses-title">
        <h2 className="mb-4 text-lg font-black uppercase" id="saved-addresses-title">
          Saved addresses
        </h2>
        {addresses.length === 0 ? (
          <p className="border-y border-ink/15 py-5 text-sm text-[#55584e]">
            You haven’t saved an address yet.
          </p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {addresses.map((address) => (
              <li
                className="border border-ink/10 bg-white/70 p-4 shadow-sm transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-ink/25 hover:shadow-md motion-reduce:transform-none motion-reduce:transition-none"
                key={address.id}
              >
                <div className="flex items-start justify-between gap-3">
                  <address className="not-italic text-sm leading-6">
                    <strong className="block">
                      {address.isDefault ? "Default address" : "Saved address"}
                    </strong>
                    {address.line1}
                    {address.line2 && <><br />{address.line2}</>}
                    <br />
                    {address.city}, {address.postalCode}
                    <br />
                    {address.country}
                  </address>
                  {address.isDefault && (
                    <span className="inline-flex min-h-7 items-center border border-olive bg-lime/15 px-2.5 py-1 text-[.55rem] font-bold uppercase tracking-[.08em] text-ink">
                      Default
                    </span>
                  )}
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  {!address.isDefault && (
                    <button
                      className="inline-flex min-h-11 items-center px-2 text-xs font-bold underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-olive"
                      disabled={isSaving}
                      onClick={() => {
                        const next = addresses.map((entry) => ({
                          ...entry,
                          isDefault: entry.id === address.id,
                        }));
                        void saveAction({ action: "default", id: address.id }, next);
                      }}
                      type="button"
                    >
                      Make default
                    </button>
                  )}
                  <button
                    className="inline-flex min-h-11 items-center px-2 text-xs font-bold underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-olive"
                    disabled={isSaving}
                    onClick={() => beginEdit(address)}
                    type="button"
                  >
                    Edit
                  </button>
                  <button
                    className="inline-flex min-h-11 items-center px-2 text-xs font-bold text-red-800 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-olive"
                    disabled={isSaving}
                    onClick={() => deleteAddress(address)}
                    type="button"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="address-form-title" className="border-t border-ink/15 pt-6">
        <h2 className="mb-4 text-lg font-black uppercase" id="address-form-title">
          {editingId ? "Edit address" : "Add an address"}
        </h2>
        <form className="grid gap-4 sm:grid-cols-2" onSubmit={submitAddress}>
          <AddressField
            autoComplete="address-line1"
            label="Address line 1"
            maxLength={200}
            onChange={(line1) => setFormValues((value) => ({ ...value, line1 }))}
            required
            value={formValues.line1}
          />
          <AddressField
            autoComplete="address-line2"
            label="Address line 2 (optional)"
            maxLength={200}
            onChange={(line2) => setFormValues((value) => ({ ...value, line2 }))}
            value={formValues.line2 ?? ""}
          />
          <AddressField
            autoComplete="address-level2"
            label="City"
            maxLength={100}
            onChange={(city) => setFormValues((value) => ({ ...value, city }))}
            required
            value={formValues.city}
          />
          <AddressField
            autoComplete="postal-code"
            label="Postal code"
            maxLength={30}
            onChange={(postalCode) => setFormValues((value) => ({ ...value, postalCode }))}
            required
            value={formValues.postalCode}
          />
          <AddressField
            autoComplete="country-name"
            label="Country"
            maxLength={100}
            onChange={(country) => setFormValues((value) => ({ ...value, country }))}
            required
            value={formValues.country}
          />
          <div className="flex items-end gap-3">
            <button
              className="min-h-11 bg-ink px-4 text-[.65rem] font-bold uppercase tracking-[.08em] text-paper transition-colors hover:bg-olive focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-olive disabled:opacity-60 motion-reduce:transition-none"
              disabled={isSaving}
              type="submit"
            >
              {isSaving ? "Saving..." : editingId ? "Save address" : "Add address"}
            </button>
            {editingId && (
              <button
                className="min-h-11 px-3 text-[.65rem] font-bold uppercase tracking-[.08em] underline focus-visible:outline-2"
                onClick={() => {
                  setEditingId(null);
                  setFormValues(emptyAddress);
                }}
                type="button"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
        <p className="mt-4 min-h-5 text-sm text-[#55584e]" role="status" aria-live="polite" aria-atomic="true">
          {message}
        </p>
      </section>
    </div>
  );
}

function AddressField({
  autoComplete,
  label,
  maxLength,
  onChange,
  required = false,
  value,
}: {
  autoComplete: string;
  label: string;
  maxLength: number;
  onChange: (value: string) => void;
  required?: boolean;
  value: string;
}) {
  return (
    <label className="grid gap-2 text-[.65rem] font-bold uppercase tracking-[.1em]">
      {label}
      <input
        autoComplete={autoComplete}
        className="auth-input"
        maxLength={maxLength}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        value={value}
      />
    </label>
  );
}
