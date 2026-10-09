"use client";

import { ArrowUpRight } from "lucide-react";
import { useCallback, useState, type FormEvent } from "react";
import {
  useCustomerProfileAutofill,
  type CustomerProfile,
} from "@/components/CustomerProfileProvider";

export type CheckoutAddress = {
  id: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string | null;
  postalCode: string;
  country: string;
  isDefault: boolean;
};

type CheckoutItem = { variantId: string; quantity: number };
type AddressFields = Omit<CheckoutAddress, "id" | "isDefault">;

const emptyAddress: AddressFields = {
  line1: "",
  line2: "",
  city: "",
  state: "",
  postalCode: "",
  country: "",
};

export function CheckoutForm({
  items,
  savedAddresses,
  defaultAddress,
  isAuthenticated,
}: {
  items: CheckoutItem[];
  savedAddresses: CheckoutAddress[];
  defaultAddress: CheckoutAddress | null;
  isAuthenticated: boolean;
}) {
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedAddressId, setSelectedAddressId] = useState(defaultAddress?.id ?? "new");
  const [addressFields, setAddressFields] = useState<AddressFields>(defaultAddress ?? emptyAddress);
  const resolveCustomerFields = useCallback(
    (profile: CustomerProfile) => ({
      firstName: profile.firstName,
      lastName: profile.lastName,
      email: profile.email,
      phone: profile.phone,
    }),
    [],
  );
  const {
    formRef,
    onChange,
    status: profileStatus,
  } = useCustomerProfileAutofill(resolveCustomerFields);

  function selectAddress(value: string) {
    setSelectedAddressId(value);
    const address = savedAddresses.find((savedAddress) => savedAddress.id === value);
    setAddressFields(
      address
        ? {
            line1: address.line1,
            line2: address.line2,
            city: address.city,
            state: address.state,
            postalCode: address.postalCode,
            country: address.country,
          }
        : emptyAddress,
    );
  }

  function updateAddressField(field: keyof AddressFields, value: string) {
    setAddressFields((fields) => ({ ...fields, [field]: value }));
  }

  async function checkout(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsCheckingOut(true);
    setError(null);
    try {
      const formData = new FormData(event.currentTarget);
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items,
          customer: {
            firstName: formData.get("firstName"),
            lastName: formData.get("lastName"),
            email: formData.get("email"),
            phone: formData.get("phone"),
          },
          address: {
            streetAddress: formData.get("streetAddress"),
            aptSuite: formData.get("aptSuite"),
            city: formData.get("city"),
            state: formData.get("state"),
            postalCode: formData.get("postalCode"),
            country: formData.get("country"),
          },
          saveAddress:
            isAuthenticated && selectedAddressId === "new" && formData.get("saveAddress") === "on",
        }),
      });
      const result = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !result.url) throw new Error(result.error || "Unable to start checkout.");
      window.location.href = result.url;
    } catch (checkoutError) {
      setError(
        checkoutError instanceof Error ? checkoutError.message : "Unable to start checkout.",
      );
      setIsCheckingOut(false);
    }
  }

  return (
    <form className="mt-6 grid gap-4" onChange={onChange} onSubmit={checkout} ref={formRef}>
      <p className="text-sm leading-[1.6] text-[#55584e]">
        OnePay requires your name, email, and phone number to create the payment.
      </p>
      {profileStatus === "error" && (
        <p className="text-sm text-muted" role="status">
          Saved details could not be loaded. You can still enter your details manually.
        </p>
      )}
      <label className="grid gap-2 text-[.65rem] font-bold uppercase tracking-[.1em]">
        First name
        <input
          autoComplete="given-name"
          className="auth-input"
          maxLength={100}
          name="firstName"
          required
        />
      </label>
      <label className="grid gap-2 text-[.65rem] font-bold uppercase tracking-[.1em]">
        Last name
        <input
          autoComplete="family-name"
          className="auth-input"
          maxLength={100}
          name="lastName"
          required
        />
      </label>
      <label className="grid gap-2 text-[.65rem] font-bold uppercase tracking-[.1em]">
        Email
        <input
          autoComplete="email"
          className="auth-input"
          maxLength={254}
          name="email"
          required
          type="email"
        />
      </label>
      <label className="grid gap-2 text-[.65rem] font-bold uppercase tracking-[.1em]">
        Phone number (E.164, e.g. +94771234567)
        <input
          autoComplete="tel"
          className="auth-input"
          name="phone"
          pattern="\+[1-9][0-9]{7,14}"
          placeholder="+94771234567"
          required
          type="tel"
        />
      </label>
      {isAuthenticated && savedAddresses.length > 0 && (
        <label className="grid gap-2 text-[.65rem] font-bold uppercase tracking-[.1em]">
          Delivery address
          <select
            className="auth-input"
            onChange={(event) => selectAddress(event.currentTarget.value)}
            value={selectedAddressId}
          >
            {savedAddresses.map((address) => (
              <option key={address.id} value={address.id}>
                {address.line1} - {address.city}
                {address.isDefault ? " (Default)" : ""}
              </option>
            ))}
            <option value="new">+ Enter a new address</option>
          </select>
        </label>
      )}
      <p className="pt-2 text-[.65rem] font-bold uppercase tracking-[.1em]">Delivery address</p>
      <label className="grid gap-2 text-[.65rem] font-bold uppercase tracking-[.1em]">
        Street address
        <input
          autoComplete="address-line1"
          className="auth-input"
          maxLength={200}
          name="streetAddress"
          onChange={(event) => updateAddressField("line1", event.currentTarget.value)}
          required
          value={addressFields.line1}
        />
      </label>
      <label className="grid gap-2 text-[.65rem] font-bold uppercase tracking-[.1em]">
        Apartment, suite, etc. (optional)
        <input
          autoComplete="address-line2"
          className="auth-input"
          maxLength={200}
          name="aptSuite"
          onChange={(event) => updateAddressField("line2", event.currentTarget.value)}
          value={addressFields.line2 ?? ""}
        />
      </label>
      <label className="grid gap-2 text-[.65rem] font-bold uppercase tracking-[.1em]">
        City
        <input
          autoComplete="address-level2"
          className="auth-input"
          maxLength={100}
          name="city"
          onChange={(event) => updateAddressField("city", event.currentTarget.value)}
          required
          value={addressFields.city}
        />
      </label>
      <label className="grid gap-2 text-[.65rem] font-bold uppercase tracking-[.1em]">
        State / province
        <input
          autoComplete="address-level1"
          className="auth-input"
          maxLength={100}
          name="state"
          onChange={(event) => updateAddressField("state", event.currentTarget.value)}
          required
          value={addressFields.state ?? ""}
        />
      </label>
      <label className="grid gap-2 text-[.65rem] font-bold uppercase tracking-[.1em]">
        Postal code
        <input
          autoComplete="postal-code"
          className="auth-input"
          maxLength={30}
          name="postalCode"
          onChange={(event) => updateAddressField("postalCode", event.currentTarget.value)}
          required
          value={addressFields.postalCode}
        />
      </label>
      <label className="grid gap-2 text-[.65rem] font-bold uppercase tracking-[.1em]">
        Country
        <input
          autoComplete="country-name"
          className="auth-input"
          maxLength={100}
          name="country"
          onChange={(event) => updateAddressField("country", event.currentTarget.value)}
          required
          value={addressFields.country}
        />
      </label>
      {isAuthenticated && selectedAddressId === "new" && (
        <label className="flex items-start gap-3 text-sm leading-[1.5] text-[#55584e]">
          <input className="mt-1 accent-[#65771b]" name="saveAddress" type="checkbox" />
          Save this address to my account for future orders
        </label>
      )}
      <button
        className="button-primary inline-flex w-full items-center justify-center gap-3 px-5 py-4 text-[.7rem] tracking-[.1em] text-paper"
        disabled={isCheckingOut}
        type="submit"
      >
        {isCheckingOut ? (
          "Opening checkout..."
        ) : (
          <>
            Checkout{" "}
            <ArrowUpRight aria-hidden="true" className="h-4 w-4 shrink-0" strokeWidth={2} />
          </>
        )}
      </button>
      {error && (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
