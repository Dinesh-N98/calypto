"use client";

import type { ChangeEvent, ReactNode } from "react";

export function FormCard({
  title,
  description,
  children,
  className,
  headingLevel = "h2",
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  headingLevel?: "h2" | "h3";
}) {
  const Heading = headingLevel;
  return (
    <section
      className={`rounded-xl border border-black/10 bg-white p-5 shadow-sm sm:p-6${className ? ` ${className}` : ""}`}
    >
      <div className="mb-5">
        <Heading className="text-base font-extrabold tracking-tight text-[#20231b]">
          {title}
        </Heading>
        {description && <p className="mt-1 text-xs leading-5 text-[#73786b]">{description}</p>}
      </div>
      {children}
    </section>
  );
}

export function FieldLabel({
  htmlFor,
  children,
  className = "block text-xs font-bold text-[#55594f]",
}: {
  htmlFor: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={className} htmlFor={htmlFor}>
      {children}
    </label>
  );
}

export function FieldError({ children, id }: { children?: string; id?: string }) {
  if (!children) return null;
  return (
    <span className="mt-1 block text-xs font-medium text-red-700" id={id} role="alert">
      {children}
    </span>
  );
}

export function CurrencyInput({
  label,
  id,
  name,
  value,
  onChange,
  placeholder,
  error,
  required = false,
  inputMode,
  labelClassName,
}: {
  label: string;
  id: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  required?: boolean;
  inputMode?: "decimal" | "numeric";
  labelClassName?: string;
}) {
  const errorId = `${id}-error`;
  return (
    <div>
      <FieldLabel className={labelClassName} htmlFor={id}>
        {label}
      </FieldLabel>
      <div className="mt-1 flex items-center rounded-lg border border-black/15 bg-white focus-within:ring-2 focus-within:ring-[#718126]/20">
        <span aria-hidden="true" className="pl-3 text-sm font-semibold text-[#73786b]">
          $
        </span>
        <input
          aria-describedby={error ? errorId : undefined}
          aria-invalid={Boolean(error)}
          className="min-h-11 min-w-0 flex-1 border-0 bg-transparent px-2 text-sm outline-none"
          id={id}
          inputMode={inputMode}
          min="0.01"
          name={name}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          required={required}
          step="0.01"
          type="number"
          value={value}
        />
      </div>
      <FieldError id={errorId}>{error}</FieldError>
    </div>
  );
}

export function UnitInput({
  label,
  id,
  name,
  unit,
  value,
  onChange,
  error,
  min,
  step,
  required = false,
}: {
  label: string;
  id: string;
  name: string;
  unit: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  min: string;
  step: string;
  required?: boolean;
}) {
  const errorId = `${id}-error`;
  return (
    <div>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <div className="flex items-center rounded-md border border-black/15 bg-white focus-within:ring-2 focus-within:ring-[#718126]/20">
        <input
          aria-describedby={error ? errorId : undefined}
          aria-invalid={Boolean(error)}
          className="min-h-11 min-w-0 flex-1 rounded-l-md border-0 bg-transparent px-3 text-sm outline-none"
          id={id}
          min={min}
          name={name}
          onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(event.target.value)}
          required={required}
          step={step}
          type="number"
          value={value}
        />
        <span aria-hidden="true" className="px-3 text-xs font-semibold text-[#73786b]">
          {unit}
        </span>
      </div>
      <FieldError id={errorId}>{error}</FieldError>
    </div>
  );
}
