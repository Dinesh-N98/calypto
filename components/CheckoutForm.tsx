"use client";

import { ArrowLeft, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { PayPalCheckoutButtons } from "@/components/PayPalCheckoutButtons";
import type { CheckoutPayload } from "@/lib/checkout/types";
import {
  DHL_COUNTRIES,
  PHONE_COUNTRY_CODES,
  normalizeCountryCode,
} from "@/lib/checkout/international";

export type CheckoutProfile = {
  firstName: string | null;
  lastName: string | null;
  email: string;
  phone: string | null;
};

export type CheckoutAddress = {
  id: string;
  line1: string;
  line2: string | null;
  line3?: string | null;
  city: string;
  state: string | null;
  postalCode: string;
  country: string;
  isDefault: boolean;
};

type CheckoutItem = { variantId: string; quantity: number };
type DhlRateOption = {
  serviceCode?: string;
  serviceName?: string;
  currency: string;
  amount: number;
  transitDays?: number;
};
type AddressFields = Omit<CheckoutAddress, "id" | "isDefault">;
type ContactFields = { firstName: string; lastName: string; email: string; phone: string };
export type CheckoutPaymentProvider = "ONEPAY" | "PAYPAL";
export type CheckoutStep = 2 | 3 | 4 | 5;
export type CheckoutReviewData = {
  contact: ContactFields;
  address: AddressFields;
  shipping: { label: string; amountCents: number | null };
  paymentProvider: CheckoutPaymentProvider;
};

function normalizeE164Phone(value: string): string {
  const digits = value.replace(/\D/gu, "");
  return digits ? `+${digits}` : "";
}

function getPhoneSubscriber(value: string, countryCode: string): string {
  const digits = normalizeE164Phone(value).slice(1);
  const callingCodeDigits = countryCode.slice(1);
  return digits.startsWith(callingCodeDigits) ? digits.slice(callingCodeDigits.length) : digits;
}

const emptyAddress: AddressFields = {
  line1: "",
  line2: "",
  line3: "",
  city: "",
  state: "",
  postalCode: "",
  country: "",
};

function CheckoutLegalNotice() {
  return (
    <p className="text-xs leading-5 text-[#c9cbbf]">
      By placing your order, you agree to Calypto&apos;s{" "}
      <Link className="text-lime underline underline-offset-4" href="/terms">
        Terms of Service
      </Link>
      ,{" "}
      <Link className="text-lime underline underline-offset-4" href="/privacy">
        Privacy Policy
      </Link>
      , and{" "}
      <Link className="text-lime underline underline-offset-4" href="/refund-policy">
        Refund Policy
      </Link>
      .
    </p>
  );
}

export function CheckoutForm({
  items,
  savedAddresses,
  defaultAddress,
  profile,
  isAuthenticated,
  paymentProvider,
  paypalClientId,
  currentStep = 4,
  onPaymentProviderChange,
  onReviewDataChange,
  onShippingCostChange,
  onStepChange,
}: {
  items: CheckoutItem[];
  savedAddresses: CheckoutAddress[];
  defaultAddress: CheckoutAddress | null;
  profile: CheckoutProfile | null;
  isAuthenticated: boolean;
  paymentProvider: CheckoutPaymentProvider;
  paypalClientId: string;
  currentStep?: CheckoutStep;
  onPaymentProviderChange?: (provider: CheckoutPaymentProvider) => void;
  onReviewDataChange?: (data: CheckoutReviewData) => void;
  onShippingCostChange?: (shippingCents: number | null) => void;
  onStepChange?: (step: CheckoutStep) => void;
}) {
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [dhlRates, setDhlRates] = useState<DhlRateOption[]>([]);
  const [selectedDhlRate, setSelectedDhlRate] = useState("");
  const [dhlQuoteItemsKey, setDhlQuoteItemsKey] = useState("");
  const [loadingDhlRates, setLoadingDhlRates] = useState(false);
  const [phoneCountryCode, setPhoneCountryCode] = useState(() =>
    getPhoneCountryCode(profile?.phone),
  );
  const [error, setError] = useState<string | null>(null);
  const [selectedAddressId, setSelectedAddressId] = useState(() => defaultAddress?.id ?? "new");
  const [addressFields, setAddressFields] = useState<AddressFields>(() =>
    defaultAddress ? addressToFields(defaultAddress) : { ...emptyAddress },
  );
  const [addressDrafts, setAddressDrafts] = useState<Record<string, AddressFields>>(() => ({
    [defaultAddress?.id ?? "new"]: defaultAddress
      ? addressToFields(defaultAddress)
      : { ...emptyAddress },
  }));
  const [contactFields, setContactFields] = useState<ContactFields>(() => ({
    firstName: profile?.firstName ?? "",
    lastName: profile?.lastName ?? "",
    email: profile?.email ?? "",
    phone: profile?.phone ? normalizeE164Phone(profile.phone) : "",
  }));
  const dirtyContactFields = useRef(new Set<keyof ContactFields>());
  const formElementRef = useRef<HTMLFormElement | null>(null);
  const quoteDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const quoteRequestIdRef = useRef(0);
  const quoteAbortRef = useRef<{ contextKey: string; controller: AbortController } | null>(null);
  const onShippingCostChangeRef = useRef(onShippingCostChange);
  onShippingCostChangeRef.current = onShippingCostChange;
  const itemKey = items.map((item) => `${item.variantId}:${item.quantity}`).join("|");
  const addressKey = [
    addressFields.line1,
    addressFields.line2 ?? "",
    addressFields.city,
    addressFields.state ?? "",
    addressFields.postalCode,
    addressFields.country,
  ].join("|");
  const quoteContextKey = `${addressKey}|${itemKey}`;
  const currentQuoteContextRef = useRef({ key: quoteContextKey, step: currentStep });
  currentQuoteContextRef.current = { key: quoteContextKey, step: currentStep };
  const previousQuoteContextKeyRef = useRef(quoteContextKey);
  const rateRequestBody = useMemo(
    () => ({
      items,
      recipient: {
        streetLines: [addressFields.line1, addressFields.line2, addressFields.line3]
          .map((line) => line?.trim())
          .filter((line): line is string => Boolean(line)),
        city: addressFields.city,
        postalCode: addressFields.postalCode,
        countryCode: normalizeCountryCode(addressFields.country),
        stateOrProvinceCode: addressFields.state ?? "",
      },
    }),
    [addressFields, itemKey, items],
  );
  const isAddressValid =
    Boolean(addressFields.line1.trim()) &&
    addressFields.line1.trim().length <= 70 &&
    (!addressFields.line2?.trim() || addressFields.line2.trim().length <= 70) &&
    (!addressFields.line3?.trim() || addressFields.line3.trim().length <= 70) &&
    Boolean(addressFields.city.trim()) &&
    addressFields.city.trim().length <= 100 &&
    Boolean(addressFields.state?.trim()) &&
    (addressFields.state?.trim().length ?? 0) <= 100 &&
    Boolean(addressFields.postalCode.trim()) &&
    addressFields.postalCode.trim().length <= 30 &&
    DHL_COUNTRIES.some(([code]) => code === normalizeCountryCode(addressFields.country)) &&
    items.length > 0;
  const selectedRate = useMemo(
    () => dhlRates.find((rate) => rate.serviceCode === selectedDhlRate),
    [dhlRates, selectedDhlRate],
  );
  const hasCurrentQuote = dhlQuoteItemsKey === quoteContextKey;
  const currentDhlRates = hasCurrentQuote ? dhlRates : [];
  const selectedShippingCents =
    selectedRate && hasCurrentQuote ? Math.ceil(selectedRate.amount * 100) : null;
  const canSubmitOnePay = !loadingDhlRates && selectedRate !== undefined && hasCurrentQuote;
  const maxPhoneSubscriberDigits = 15 - (phoneCountryCode.length - 1);
  const setFormRef = useCallback((element: HTMLFormElement | null) => {
    formElementRef.current = element;
  }, []);

  useEffect(() => {
    onReviewDataChange?.({
      contact: contactFields,
      address: addressFields,
      shipping: {
        label: "Shipping fee",
        amountCents: selectedShippingCents,
      },
      paymentProvider,
    });
  }, [
    addressFields,
    contactFields,
    onReviewDataChange,
    paymentProvider,
    selectedShippingCents,
  ]);

  function validateStep(step: CheckoutStep): boolean {
    const form = formElementRef.current;
    const section = form?.querySelector<HTMLFieldSetElement>(`[data-checkout-step="${step}"]`);
    return section?.reportValidity() ?? false;
  }

  function goToStep(step: CheckoutStep) {
    onStepChange?.(step);
  }

  function continueToStep(step: CheckoutStep) {
    if (currentStep === 2 && !validateStep(2)) return;
    if (currentStep === 3) {
      if (!canSubmitOnePay) {
        setError("Select a DHL shipping service before continuing.");
        return;
      }
    }
    setError(null);
    goToStep(step);
  }

  useEffect(() => {
    if (!profile) return;
    setContactFields((fields) => {
      const next = { ...fields };
      for (const field of ["firstName", "lastName", "email", "phone"] as const) {
        const value = profile[field];
        if (!fields[field] && !dirtyContactFields.current.has(field) && value) {
          next[field] = field === "phone" ? normalizeE164Phone(value) : value;
        }
      }
      return next;
    });
  }, [profile]);

  useEffect(() => {
    onShippingCostChange?.(selectedShippingCents);
  }, [onShippingCostChange, selectedShippingCents]);

  const buildCheckoutPayload = useCallback(
    (formData: FormData): CheckoutPayload => ({
      items,
      customer: {
        firstName: String(formData.get("firstName") ?? ""),
        lastName: String(formData.get("lastName") ?? ""),
        email: String(formData.get("email") ?? ""),
        phone: normalizeE164Phone(
          `${phoneCountryCode}${String(formData.get("phoneSubscriber") ?? "")}`,
        ),
      },
      address: {
        streetAddress: String(formData.get("streetAddress") ?? ""),
        aptSuite: String(formData.get("aptSuite") ?? ""),
        city: String(formData.get("city") ?? ""),
        state: String(formData.get("state") ?? ""),
        postalCode: String(formData.get("postalCode") ?? ""),
        country: normalizeCountryCode(String(formData.get("country") ?? "")),
        addressLine3: String(formData.get("addressLine3") ?? ""),
      },
      saveAddress:
        isAuthenticated && selectedAddressId === "new" && formData.get("saveAddress") === "on",
      shippingServiceCode: selectedRate && hasCurrentQuote ? selectedRate.serviceCode : undefined,
    }),
    [hasCurrentQuote, isAuthenticated, items, phoneCountryCode, selectedAddressId, selectedRate],
  );

  const getPayPalPayload = useCallback(() => {
    const form = formElementRef.current;
    if (!form || (currentStep !== 5 && !form.reportValidity())) return null;
    return buildCheckoutPayload(new FormData(form));
  }, [buildCheckoutPayload, currentStep]);

  function invalidateQuote() {
    if (quoteDebounceRef.current) clearTimeout(quoteDebounceRef.current);
    quoteDebounceRef.current = null;
    quoteRequestIdRef.current += 1;
    quoteAbortRef.current?.controller.abort();
    quoteAbortRef.current = null;
    setLoadingDhlRates(false);
    setDhlRates([]);
    setSelectedDhlRate("");
    setDhlQuoteItemsKey("");
    setError(null);
    onShippingCostChangeRef.current?.(null);
  }

  function selectAddress(value: string) {
    const address = savedAddresses.find((savedAddress) => savedAddress.id === value);
    const nextFields =
      addressDrafts[value] ?? (address ? addressToFields(address) : { ...emptyAddress });
    setAddressDrafts((drafts) => ({
      ...drafts,
      [selectedAddressId]: { ...addressFields },
      [value]: { ...nextFields },
    }));
    setSelectedAddressId(value);
    setAddressFields(nextFields);
    invalidateQuote();
  }

  function updateAddressField(field: keyof AddressFields, value: string) {
    const nextFields = { ...addressFields, [field]: value };
    setAddressDrafts((drafts) => ({ ...drafts, [selectedAddressId]: nextFields }));
    setAddressFields(nextFields);
    invalidateQuote();
  }

  const loadDhlRates = useCallback(async (contextKey: string) => {
    if (
      currentQuoteContextRef.current.key !== contextKey ||
      currentQuoteContextRef.current.step !== 3
    ) return;
    const requestId = ++quoteRequestIdRef.current;
    const controller = new AbortController();
    quoteAbortRef.current = { contextKey, controller };
    setLoadingDhlRates(true);
    setError(null);
    try {
      const response = await fetch("/api/checkout/rates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rateRequestBody),
        signal: controller.signal,
      });
      const result: unknown = await response.json().catch(() => null);
      if (
        !response.ok ||
        !result ||
        typeof result !== "object" ||
        !("rates" in result) ||
        !Array.isArray(result.rates)
      ) {
        throw new Error(
          result &&
            typeof result === "object" &&
            "error" in result &&
            typeof result.error === "string"
            ? result.error
            : "Unable to calculate DHL shipping rates.",
        );
      }
      const rates = result.rates as DhlRateOption[];
      const selectableRates = rates.filter((rate) => Boolean(rate.serviceCode));
      if (!selectableRates.length) throw new Error("DHL returned no selectable shipping options.");
      if (
        requestId !== quoteRequestIdRef.current ||
        currentQuoteContextRef.current.key !== contextKey ||
        currentQuoteContextRef.current.step !== 3
      ) return;
      setDhlRates(selectableRates);
      setSelectedDhlRate(selectableRates[0].serviceCode ?? "");
      setDhlQuoteItemsKey(contextKey);
    } catch (rateError) {
      if (
        requestId !== quoteRequestIdRef.current ||
        currentQuoteContextRef.current.key !== contextKey ||
        currentQuoteContextRef.current.step !== 3
      ) return;
      setError(
        rateError instanceof Error ? rateError.message : "Unable to calculate DHL shipping rates.",
      );
    } finally {
      if (requestId === quoteRequestIdRef.current) {
        quoteAbortRef.current = null;
        setLoadingDhlRates(false);
      }
    }
  }, [rateRequestBody]);

  useEffect(() => {
    const contextChanged = previousQuoteContextKeyRef.current !== quoteContextKey;
    previousQuoteContextKeyRef.current = quoteContextKey;
    if (contextChanged) {
      quoteRequestIdRef.current += 1;
      quoteAbortRef.current?.controller.abort();
      quoteAbortRef.current = null;
      setLoadingDhlRates(false);
      setDhlRates([]);
      setSelectedDhlRate("");
      setDhlQuoteItemsKey("");
      setError(null);
      onShippingCostChange?.(null);
    }

    if (currentStep !== 3 || !isAddressValid) {
      if (currentStep !== 3) setLoadingDhlRates(false);
      return;
    }
    if (dhlQuoteItemsKey === quoteContextKey && dhlRates.length > 0) return;

    const timer = setTimeout(() => {
      quoteDebounceRef.current = null;
      void loadDhlRates(quoteContextKey);
    }, 300);
    quoteDebounceRef.current = timer;

    return () => {
      clearTimeout(timer);
      if (quoteDebounceRef.current === timer) quoteDebounceRef.current = null;
      if (quoteAbortRef.current?.contextKey === quoteContextKey) {
        quoteRequestIdRef.current += 1;
        quoteAbortRef.current.controller.abort();
        quoteAbortRef.current = null;
      }
    };
  }, [
    currentStep,
    dhlQuoteItemsKey,
    dhlRates.length,
    isAddressValid,
    loadDhlRates,
    quoteContextKey,
  ]);

  function updateContactField(field: keyof ContactFields, value: string) {
    dirtyContactFields.current.add(field);
    setContactFields((fields) => ({ ...fields, [field]: value }));
  }

  async function checkout(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (paymentProvider !== "ONEPAY") return;
    if (currentStep !== 5) return;
    if (!canSubmitOnePay) {
      setError("Select a DHL shipping service before checkout.");
      return;
    }
    setIsCheckingOut(true);
    setError(null);
    try {
      const formData = new FormData(event.currentTarget);
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildCheckoutPayload(formData)),
      });
      const result: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        console.error("Checkout request failed.", {
          status: response.status,
          body: result,
        });
      }
      const errorMessage =
        result &&
        typeof result === "object" &&
        "error" in result &&
        typeof result.error === "string"
          ? result.error
          : "Unable to start checkout.";
      if (
        !result ||
        typeof result !== "object" ||
        !("url" in result) ||
        typeof result.url !== "string" ||
        !result.url
      ) {
        throw new Error(errorMessage);
      }
      if (!response.ok) throw new Error(errorMessage);
      window.location.href = result.url;
    } catch (checkoutError) {
      setError(
        checkoutError instanceof Error ? checkoutError.message : "Unable to start checkout.",
      );
      setIsCheckingOut(false);
    }
  }

  return (
    <>
      <form className="mt-6 grid gap-6" onSubmit={checkout} ref={setFormRef}>
        <fieldset className="grid gap-4" data-checkout-step="2" hidden={currentStep !== 2}>
          <legend className="text-base font-bold">Contact information</legend>
          <p className="text-sm text-[#62665b]">
            We&apos;ll use this to send your order confirmation and delivery updates.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-[.65rem] font-bold uppercase tracking-[.1em]">
              First name
              <input
                autoComplete="given-name"
                className="auth-input"
                maxLength={100}
                name="firstName"
                onChange={(event) => updateContactField("firstName", event.currentTarget.value)}
                required
                value={contactFields.firstName}
              />
            </label>
            <label className="grid gap-2 text-[.65rem] font-bold uppercase tracking-[.1em]">
              Last name
              <input
                autoComplete="family-name"
                className="auth-input"
                maxLength={100}
                name="lastName"
                onChange={(event) => updateContactField("lastName", event.currentTarget.value)}
                required
                value={contactFields.lastName}
              />
            </label>
            <label className="grid gap-2 text-[.65rem] font-bold uppercase tracking-[.1em] sm:col-span-2">
              Email
              <input
                autoComplete="email"
                className="auth-input"
                maxLength={254}
                name="email"
                onChange={(event) => updateContactField("email", event.currentTarget.value)}
                required
                type="email"
                value={contactFields.email}
              />
            </label>
            <div className="grid gap-2 sm:col-span-2">
              <p className="text-[.65rem] font-bold uppercase tracking-[.1em]">
                Phone number (E.164, e.g. +94771234567)
              </p>
              <div className="grid gap-2 sm:grid-cols-[minmax(0,11rem)_1fr]">
                <label className="grid gap-2 text-[.65rem] font-bold uppercase tracking-[.1em]">
                  Calling code
                  <select
                    aria-label="Calling code"
                    className="auth-input"
                    onChange={(event) => {
                      const nextCode = event.currentTarget.value;
                      const subscriber = getPhoneSubscriber(contactFields.phone, phoneCountryCode);
                      setPhoneCountryCode(nextCode);
                      updateContactField("phone", subscriber ? `${nextCode}${subscriber}` : "");
                    }}
                    value={phoneCountryCode}
                  >
                    {PHONE_COUNTRY_CODES.map(([code, name]) => (
                      <option key={code} value={code}>
                        {code} — {name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-2 text-[.65rem] font-bold uppercase tracking-[.1em]">
                  Phone number (E.164)
                  <span className="relative block">
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-base font-semibold text-[#55584e]"
                    >
                      ({phoneCountryCode})
                    </span>
                    <input
                      aria-label="Phone number (E.164)"
                      autoComplete="tel-national"
                      className="auth-input"
                      maxLength={maxPhoneSubscriberDigits}
                      name="phoneSubscriber"
                      onChange={(event) => {
                        const subscriber = event.currentTarget.value.replace(/\D/gu, "");
                        updateContactField(
                          "phone",
                          subscriber ? `${phoneCountryCode}${subscriber}` : "",
                        );
                      }}
                      pattern={`[0-9]{7,${maxPhoneSubscriberDigits}}`}
                      placeholder="771234567"
                      required
                      style={{ paddingLeft: "6rem" }}
                      type="tel"
                      value={getPhoneSubscriber(contactFields.phone, phoneCountryCode)}
                    />
                  </span>
                </label>
              </div>
            </div>
          </div>
        </fieldset>
        <fieldset
          className="grid gap-4 border-t border-[#e5e5dc] pt-6"
          data-checkout-step="3"
          hidden={currentStep !== 3}
        >
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
          <legend className="text-base font-bold">Delivery address</legend>
          <p className="text-sm text-[#62665b]">Where should we send your order?</p>
          <label className="grid gap-2 text-[.65rem] font-bold uppercase tracking-[.1em] sm:col-span-2">
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
          <label className="grid gap-2 text-[.65rem] font-bold uppercase tracking-[.1em] sm:col-span-2">
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
          <label className="grid gap-2 text-[.65rem] font-bold uppercase tracking-[.1em] sm:col-span-2">
            Address line 3 (optional)
            <input
              autoComplete="address-line3"
              className="auth-input"
              maxLength={70}
              name="addressLine3"
              onChange={(event) => updateAddressField("line3", event.currentTarget.value)}
              value={addressFields.line3 ?? ""}
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
          <label className="grid gap-2 text-[.65rem] font-bold uppercase tracking-[.1em] sm:col-span-2">
            Country / destination
            <select
              autoComplete="country"
              className="auth-input"
              name="country"
              onChange={(event) => updateAddressField("country", event.currentTarget.value)}
              required
              value={addressFields.country}
            >
              <option value="">Select a country</option>
              {DHL_COUNTRIES.map(([code, name]) => (
                <option key={code} value={code}>
                  {name} ({code})
                </option>
              ))}
            </select>
          </label>
          {isAuthenticated && selectedAddressId === "new" && (
            <label className="flex items-start gap-3 text-sm leading-[1.5] text-[#55584e]">
              <input className="mt-1 accent-[#65771b]" name="saveAddress" type="checkbox" />
              Save this address to my account for future orders
            </label>
          )}
          <fieldset className="grid gap-3 border-t border-[#e5e5dc] pt-6">
            <legend className="text-base font-bold">Shipping fee</legend>
            {loadingDhlRates && (
              <p aria-live="polite" className="text-sm text-[#55584e]">
                Checking available shipping services and destination routing…
              </p>
            )}
            {selectedRate && hasCurrentQuote && (
              <p className="text-sm font-semibold">
                {selectedRate.currency} {selectedRate.amount.toFixed(2)}
              </p>
            )}
          </fieldset>
        </fieldset>
        <fieldset
          className="grid gap-4 border-t border-[#e5e5dc] pt-6"
          data-checkout-step="4"
          hidden={currentStep !== 4}
        >
          <legend className="text-base font-bold">Payment method</legend>
          <p className="text-sm text-[#62665b]">Choose how you would like to pay for your order.</p>
          <label
            className={`flex min-h-16 cursor-pointer items-center gap-3 rounded-xl border p-3 transition-colors ${paymentProvider === "ONEPAY" ? "border-olive bg-[#f7f8f1]" : "border-[#ddddd3] hover:border-olive/60"}`}
          >
            <input
              checked={paymentProvider === "ONEPAY"}
              className="h-4 w-4 accent-olive"
              name="paymentProvider"
              onChange={() => onPaymentProviderChange?.("ONEPAY")}
              type="radio"
              value="ONEPAY"
            />
            <span className="grid gap-0.5">
              <span className="font-bold">OnePay</span>
              <span className="text-xs font-normal text-[#62665b]">
                Secure card and local payment checkout
              </span>
            </span>
            <span className="ml-auto text-xs font-semibold text-olive">Recommended</span>
          </label>
          <label
            className={`flex min-h-16 items-center gap-3 rounded-xl border p-3 transition-colors ${paypalClientId ? (paymentProvider === "PAYPAL" ? "cursor-pointer border-olive bg-[#f7f8f1]" : "cursor-pointer border-[#ddddd3] hover:border-olive/60") : "opacity-55"}`}
          >
            <input
              checked={paymentProvider === "PAYPAL"}
              className="h-4 w-4 accent-olive"
              disabled={!paypalClientId}
              name="paymentProvider"
              onChange={() => onPaymentProviderChange?.("PAYPAL")}
              type="radio"
              value="PAYPAL"
            />
            <span className="grid gap-0.5">
              <span className="font-bold">PayPal</span>
              <span className="text-xs font-normal text-[#62665b]">
                Pay with your PayPal account
              </span>
            </span>
            {!paypalClientId && <span className="ml-auto text-xs text-[#62665b]">Unavailable</span>}
          </label>
        </fieldset>
        {currentStep === 4 && (
          <div className="flex justify-between gap-3 border-t border-[#e5e5dc] pt-6">
            <button
              className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#c9cabe] px-4 text-sm font-semibold text-ink hover:border-olive focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-olive"
              onClick={() => goToStep(3)}
              type="button"
            >
              <ArrowLeft aria-hidden="true" className="h-4 w-4" />
              Back to delivery
            </button>
            <button
              className="button-primary inline-flex min-h-11 items-center justify-center gap-2 px-5 text-sm font-bold text-paper"
              onClick={() => continueToStep(5)}
              type="button"
            >
              Review order
              <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>
        )}
        {currentStep === 5 && paymentProvider === "PAYPAL" && paypalClientId && (
          <div>
            <PayPalCheckoutButtons clientId={paypalClientId} createPayload={getPayPalPayload} />
            <div className="mt-3">
              <CheckoutLegalNotice />
            </div>
          </div>
        )}
        {currentStep === 5 && paymentProvider === "PAYPAL" && !paypalClientId && (
          <p className="text-sm text-red-700" role="alert">
            PayPal is not configured for this deployment.
          </p>
        )}
        {!loadingDhlRates && error && currentDhlRates.length === 0 && (
          <p className="text-sm text-red-700" role="alert">
            No shipping option was returned. Check the address, postal code, and country, then try
            again.
          </p>
        )}
        {currentStep === 3 && (
          <div className="flex flex-wrap justify-between gap-3 border-t border-[#e5e5dc] pt-6">
            <button
              className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#c9cabe] px-4 text-sm font-semibold text-ink hover:border-olive focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-olive"
              onClick={() => goToStep(2)}
              type="button"
            >
              <ArrowLeft aria-hidden="true" className="h-4 w-4" />
              Back to details
            </button>
            <button
              className="button-primary inline-flex min-h-11 items-center justify-center gap-2 px-5 text-sm font-bold text-paper"
              disabled={!canSubmitOnePay}
              onClick={() => continueToStep(4)}
              type="button"
            >
              Continue to payment
              <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>
        )}
        {currentStep === 2 && (
          <div className="flex justify-end border-t border-[#e5e5dc] pt-6">
            <button
              className="button-primary inline-flex min-h-11 items-center justify-center gap-2 px-5 text-sm font-bold text-paper"
              onClick={() => continueToStep(3)}
              type="button"
            >
              Continue to delivery
              <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>
        )}
        {process.env.NODE_ENV === "development" && (
          <details className="border border-dashed border-black/20 p-2 text-xs text-[#55584e]">
            <summary className="cursor-pointer">Checkout diagnostics</summary>
            <pre className="mt-2 overflow-auto whitespace-pre-wrap">
              {JSON.stringify(
                {
                  loadingDhlRates,
                  ratesCount: currentDhlRates.length,
                  selectedDhlRate,
                  dhlQuoteItemsKey,
                  quoteContextKey,
                  canSubmitOnePay,
                },
                null,
                2,
              )}
            </pre>
          </details>
        )}
        {currentStep === 5 && paymentProvider === "ONEPAY" && (
          <>
            <button
              className="button-primary inline-flex w-full items-center justify-center gap-3 px-5 py-4 text-[.7rem] tracking-[.1em] text-paper"
              disabled={isCheckingOut || !canSubmitOnePay}
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
            <CheckoutLegalNotice />
          </>
        )}
        {error && paymentProvider === "ONEPAY" && (
          <p className="text-sm text-red-700" role="alert">
            {error}
          </p>
        )}
      </form>
    </>
  );
}

function addressToFields(address: CheckoutAddress): AddressFields {
  return {
    line1: address.line1,
    line2: address.line2,
    line3: "",
    city: address.city,
    state: address.state,
    postalCode: address.postalCode,
    country: normalizeCountryCode(address.country),
  };
}

function getPhoneCountryCode(phone: string | null | undefined): string {
  const normalized = phone?.trim() ?? "";
  return PHONE_COUNTRY_CODES.find(([code]) => normalized.startsWith(code))?.[0] ?? "+94";
}
