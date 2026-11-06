"use client";

import { useState, type FormEvent } from "react";

type ShippingRates = {
  underOneKgCents: number;
  oneToThreeKgCents: number;
  overThreeKgCents: number;
};

function dollars(cents: number): string {
  return (cents / 100).toFixed(2);
}

function cents(value: string): number | null {
  if (!/^\d{1,5}(?:\.\d{1,2})?$/u.test(value)) return null;
  const parsed = Math.round(Number(value) * 100);
  return Number.isSafeInteger(parsed) && parsed > 0 && parsed <= 1_000_000 ? parsed : null;
}

export function SriLankaShippingSettingsForm({ initialRates }: { initialRates: ShippingRates }) {
  const [values, setValues] = useState({
    underOneKg: dollars(initialRates.underOneKgCents),
    oneToThreeKg: dollars(initialRates.oneToThreeKgCents),
    overThreeKg: dollars(initialRates.overThreeKgCents),
  });
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [feedbackIsError, setFeedbackIsError] = useState(false);

  async function saveRates(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const rateCents = {
      underOneKgCents: cents(values.underOneKg),
      oneToThreeKgCents: cents(values.oneToThreeKg),
      overThreeKgCents: cents(values.overThreeKg),
    };
    if (Object.values(rateCents).some((value) => value === null)) {
      setFeedback("Enter valid rates greater than $0 and no more than $10,000.");
      setFeedbackIsError(true);
      return;
    }

    setBusy(true);
    setFeedback("");
    try {
      const response = await fetch("/api/admin/shipping-rates", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rateCents),
        cache: "no-store",
      });
      const result = (await response.json()) as { rates?: ShippingRates; error?: string };
      if (!response.ok || !result.rates) {
        throw new Error(result.error ?? "Unable to save shipping rates.");
      }
      setValues({
        underOneKg: dollars(result.rates.underOneKgCents),
        oneToThreeKg: dollars(result.rates.oneToThreeKgCents),
        overThreeKg: dollars(result.rates.overThreeKgCents),
      });
      setFeedback("Sri Lanka shipping rates saved.");
      setFeedbackIsError(false);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Unable to save shipping rates.");
      setFeedbackIsError(true);
    } finally {
      setBusy(false);
    }
  }

  const fields = [
    { key: "underOneKg" as const, label: "Under 1 kg", hint: "Package weight below 1.0 kg" },
    { key: "oneToThreeKg" as const, label: "1 kg to 3 kg", hint: "Includes 1.0 kg and 3.0 kg" },
    { key: "overThreeKg" as const, label: "Over 3 kg", hint: "Package weight above 3.0 kg" },
  ];

  return (
    <form
      className="max-w-3xl space-y-6 rounded-2xl border border-black/10 bg-white p-5 shadow-sm sm:p-7"
      onSubmit={(event) => void saveRates(event)}
    >
      <div className="grid gap-5 sm:grid-cols-3">
        {fields.map(({ key, label, hint }) => (
          <label className="grid gap-2 text-sm font-semibold" htmlFor={`shipping-${key}`} key={key}>
            {label}
            <span className="text-xs font-normal text-[#65695f]">{hint}</span>
            <span className="flex min-h-11 items-center rounded-md border border-black/20 px-3 focus-within:ring-2 focus-within:ring-[#718126]">
              <span aria-hidden="true" className="mr-2 text-[#65695f]">
                $
              </span>
              <input
                className="min-w-0 flex-1 bg-transparent outline-none"
                id={`shipping-${key}`}
                inputMode="decimal"
                max="10000"
                min="0.01"
                onChange={(event) => {
                  const value = event.currentTarget.value;
                  setValues((current) => ({ ...current, [key]: value }));
                }}
                required
                step="0.01"
                type="number"
                value={values[key]}
              />
              <span className="ml-2 text-xs font-medium text-[#65695f]">USD</span>
            </span>
          </label>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <button
          className="min-h-11 rounded-md bg-[#718126] px-5 text-sm font-bold text-white hover:bg-[#59671d] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#718126] disabled:opacity-60"
          disabled={busy}
          type="submit"
        >
          {busy ? "Saving…" : "Save shipping rates"}
        </button>
        {feedback && (
          <p
            aria-live="polite"
            className={`text-sm ${feedbackIsError ? "text-red-700" : "text-green-800"}`}
          >
            {feedback}
          </p>
        )}
      </div>
    </form>
  );
}
