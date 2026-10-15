"use client";

import { Minus, Plus } from "lucide-react";

type QuantitySelectorProps = {
  label?: string;
  value: number;
  onChange: (value: number) => void;
};

export function QuantitySelector({ label = "item", value, onChange }: QuantitySelectorProps) {
  const update = (event: React.SyntheticEvent, nextValue: number) => {
    event.preventDefault();
    event.stopPropagation();
    onChange(Math.max(1, nextValue));
  };

  return (
    <div className="flex h-11 w-fit items-center border border-[rgba(13,14,12,.2)] bg-paper text-ink">
      <button
        className="h-full w-11 hover:bg-[#e4e4d9]"
        type="button"
        onClick={(event) => update(event, value - 1)}
        aria-label={`Decrease quantity of ${label}`}
      >
        <Minus aria-hidden="true" className="mx-auto h-4 w-4" strokeWidth={2} />
      </button>
      <input
        className="h-full w-11 border-x border-[rgba(13,14,12,.2)] bg-transparent text-center text-sm font-bold outline-none"
        type="number"
        min={1}
        value={value}
        onChange={(event) => update(event, Number(event.currentTarget.value) || 1)}
        aria-label={`Quantity of ${label}`}
      />
      <button
        className="h-full w-11 hover:bg-[#e4e4d9]"
        type="button"
        onClick={(event) => update(event, value + 1)}
        aria-label={`Increase quantity of ${label}`}
      >
        <Plus aria-hidden="true" className="mx-auto h-4 w-4" strokeWidth={2} />
      </button>
    </div>
  );
}
