"use client";

type QuantitySelectorProps = {
  value: number;
  onChange: (value: number) => void;
};

export function QuantitySelector({ value, onChange }: QuantitySelectorProps) {
  const update = (event: React.SyntheticEvent, nextValue: number) => {
    event.preventDefault();
    event.stopPropagation();
    onChange(Math.max(1, nextValue));
  };

  return (
    <div className="flex h-11 items-center border border-[rgba(13,14,12,.2)] bg-paper text-ink">
      <button
        className="h-full w-10 text-lg font-bold hover:bg-[#e4e4d9]"
        type="button"
        onClick={(event) => update(event, value - 1)}
        aria-label="Decrease quantity"
      >
        −
      </button>
      <input
        className="h-full w-10 border-x border-[rgba(13,14,12,.2)] bg-transparent text-center text-sm font-bold outline-none"
        type="number"
        min={1}
        value={value}
        onChange={(event) => update(event, Number(event.currentTarget.value) || 1)}
        aria-label="Quantity"
      />
      <button
        className="h-full w-10 text-lg font-bold hover:bg-[#e4e4d9]"
        type="button"
        onClick={(event) => update(event, value + 1)}
        aria-label="Increase quantity"
      >
        +
      </button>
    </div>
  );
}
