"use client";

import { z } from "zod";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { LoaderCircle } from "lucide-react";
import {
  useCustomerProfile,
  type CustomerAddressFields,
} from "@/components/CustomerProfileProvider";
import { useToast } from "@/components/ToastProvider";

const profileSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(1, "Enter your first name.")
    .max(100, "First name must be 100 characters or fewer.")
    .regex(
      /^[\p{L}\p{M}][\p{L}\p{M}'’.-]*(?: [\p{L}\p{M}'’.-]+)*$/u,
      "Use letters, spaces, apostrophes, periods, or hyphens.",
    ),
  lastName: z
    .string()
    .trim()
    .min(1, "Enter your last name.")
    .max(100, "Last name must be 100 characters or fewer.")
    .regex(
      /^[\p{L}\p{M}][\p{L}\p{M}'’.-]*(?: [\p{L}\p{M}'’.-]+)*$/u,
      "Use letters, spaces, apostrophes, periods, or hyphens.",
    ),
  defaultAddress: z.object({
    line1: z
      .string()
      .trim()
      .min(1, "Enter address line 1.")
      .max(200, "Use 200 characters or fewer."),
    line2: z.string().trim().max(200, "Use 200 characters or fewer."),
    city: z.string().trim().min(1, "Enter a city.").max(100, "Use 100 characters or fewer."),
    postalCode: z
      .string()
      .trim()
      .min(1, "Enter a postal code.")
      .max(30, "Use 30 characters or fewer."),
    country: z.string().trim().min(1, "Enter a country.").max(100, "Use 100 characters or fewer."),
  }),
  phone: z
    .string()
    .trim()
    .max(50, "Phone number must be 50 characters or fewer.")
    .refine(
      (value) =>
        !value ||
        (/^\+?[0-9().\-\s]+$/.test(value) &&
          value.replace(/\D/g, "").length >= 7 &&
          value.replace(/\D/g, "").length <= 15),
      "Enter a valid phone number with 7 to 15 digits.",
    ),
});

type ProfileFormValues = z.input<typeof profileSchema>;

function validateField(field: "firstName" | "lastName" | "phone", value: string): true | string {
  const result = profileSchema.shape[field].safeParse(value);
  return result.success ? true : (result.error.issues[0]?.message ?? "Check this field.");
}

function validateAddressField(field: keyof CustomerAddressFields, value: string): true | string {
  const result = profileSchema.shape.defaultAddress.shape[field].safeParse(value);
  return result.success ? true : (result.error.issues[0]?.message ?? "Check this field.");
}

function FieldError({ id, message }: { id: string; message?: string }) {
  return message ? (
    <p className="mt-1 text-xs text-destructive" id={id}>
      {message}
    </p>
  ) : null;
}

export function ProfileForm({
  firstName,
  lastName,
  defaultAddress,
  phone,
}: {
  firstName: string;
  lastName: string;
  defaultAddress: CustomerAddressFields;
  phone: string;
}) {
  const { updateProfile } = useCustomerProfile();
  const { showToast } = useToast();
  const router = useRouter();
  const [status, setStatus] = useState<{ message: string; type: "success" | "error" | null }>({
    message: "",
    type: null,
  });
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormValues>({
    defaultValues: { firstName, lastName, defaultAddress, phone },
    mode: "onBlur",
    reValidateMode: "onChange",
  });

  async function saveProfile(values: ProfileFormValues) {
    setStatus({ message: "", type: null });
    const validated = profileSchema.safeParse(values);
    if (!validated.success) {
      for (const issue of validated.error.issues) {
        const field = issue.path[0];
        if (field === "firstName" || field === "lastName" || field === "phone") {
          setError(field, { type: "validation", message: issue.message });
        } else if (field === "defaultAddress") {
          const addressField = issue.path[1];
          if (
            addressField === "line1" ||
            addressField === "line2" ||
            addressField === "city" ||
            addressField === "postalCode" ||
            addressField === "country"
          ) {
            setError(`defaultAddress.${addressField}`, {
              type: "validation",
              message: issue.message,
            });
          }
        }
      }
      return;
    }

    try {
      await updateProfile(validated.data);
      setStatus({ message: "Profile saved.", type: "success" });
      showToast("Profile saved.");
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to save your profile.";
      setStatus({ message, type: "error" });
      showToast(message, "error");
    }
  }

  return (
    <form
      className="grid w-full gap-5 sm:grid-cols-2"
      noValidate
      onSubmit={handleSubmit(saveProfile)}
    >
      <label className="grid min-w-0 gap-2 text-sm font-medium" htmlFor="profile-first-name">
        First name
        <input
          autoComplete="given-name"
          className="min-h-11 w-full rounded-md border border-border bg-background px-3 py-2 text-base text-foreground outline-none transition focus-visible:ring-2 focus-visible:ring-primary"
          id="profile-first-name"
          maxLength={100}
          aria-invalid={Boolean(errors.firstName)}
          aria-describedby={errors.firstName ? "profile-first-name-error" : undefined}
          {...register("firstName", { validate: (value) => validateField("firstName", value) })}
        />
        <FieldError id="profile-first-name-error" message={errors.firstName?.message} />
      </label>

      <label className="grid min-w-0 gap-2 text-sm font-medium" htmlFor="profile-last-name">
        Last name
        <input
          autoComplete="family-name"
          className="min-h-11 w-full rounded-md border border-border bg-background px-3 py-2 text-base text-foreground outline-none transition focus-visible:ring-2 focus-visible:ring-primary"
          id="profile-last-name"
          maxLength={100}
          aria-invalid={Boolean(errors.lastName)}
          aria-describedby={errors.lastName ? "profile-last-name-error" : undefined}
          {...register("lastName", { validate: (value) => validateField("lastName", value) })}
        />
        <FieldError id="profile-last-name-error" message={errors.lastName?.message} />
      </label>

      <label
        className="grid min-w-0 gap-2 text-[.7rem] font-bold uppercase tracking-[.08em] sm:col-span-2"
        htmlFor="profile-address-line1"
      >
        Address line 1
        <input
          autoComplete="address-line1"
          className="min-h-11 w-full rounded-md border border-border bg-background px-3 py-2 text-base font-normal normal-case tracking-normal text-foreground outline-none transition focus-visible:ring-2 focus-visible:ring-primary"
          id="profile-address-line1"
          maxLength={200}
          aria-invalid={Boolean(errors.defaultAddress?.line1)}
          aria-describedby={
            errors.defaultAddress?.line1 ? "profile-address-line1-error" : undefined
          }
          {...register("defaultAddress.line1", {
            validate: (value) => validateAddressField("line1", value),
          })}
        />
        <FieldError
          id="profile-address-line1-error"
          message={errors.defaultAddress?.line1?.message}
        />
      </label>

      <label
        className="grid min-w-0 gap-2 text-[.7rem] font-bold uppercase tracking-[.08em] sm:col-span-2"
        htmlFor="profile-address-line2"
      >
        Address line 2 (optional)
        <input
          autoComplete="address-line2"
          className="min-h-11 w-full rounded-md border border-border bg-background px-3 py-2 text-base font-normal normal-case tracking-normal text-foreground outline-none transition focus-visible:ring-2 focus-visible:ring-primary"
          id="profile-address-line2"
          maxLength={200}
          aria-invalid={Boolean(errors.defaultAddress?.line2)}
          aria-describedby={
            errors.defaultAddress?.line2 ? "profile-address-line2-error" : undefined
          }
          {...register("defaultAddress.line2", {
            validate: (value) => validateAddressField("line2", value),
          })}
        />
        <FieldError
          id="profile-address-line2-error"
          message={errors.defaultAddress?.line2?.message}
        />
      </label>

      <label
        className="grid min-w-0 gap-2 text-[.7rem] font-bold uppercase tracking-[.08em]"
        htmlFor="profile-city"
      >
        City
        <input
          autoComplete="address-level2"
          className="min-h-11 w-full rounded-md border border-border bg-background px-3 py-2 text-base font-normal normal-case tracking-normal text-foreground outline-none transition focus-visible:ring-2 focus-visible:ring-primary"
          id="profile-city"
          maxLength={100}
          aria-invalid={Boolean(errors.defaultAddress?.city)}
          aria-describedby={errors.defaultAddress?.city ? "profile-city-error" : undefined}
          {...register("defaultAddress.city", {
            validate: (value) => validateAddressField("city", value),
          })}
        />
        <FieldError id="profile-city-error" message={errors.defaultAddress?.city?.message} />
      </label>

      <label
        className="grid min-w-0 gap-2 text-[.7rem] font-bold uppercase tracking-[.08em]"
        htmlFor="profile-postal-code"
      >
        Postal code
        <input
          autoComplete="postal-code"
          className="min-h-11 w-full rounded-md border border-border bg-background px-3 py-2 text-base font-normal normal-case tracking-normal text-foreground outline-none transition focus-visible:ring-2 focus-visible:ring-primary"
          id="profile-postal-code"
          maxLength={30}
          aria-invalid={Boolean(errors.defaultAddress?.postalCode)}
          aria-describedby={
            errors.defaultAddress?.postalCode ? "profile-postal-code-error" : undefined
          }
          {...register("defaultAddress.postalCode", {
            validate: (value) => validateAddressField("postalCode", value),
          })}
        />
        <FieldError
          id="profile-postal-code-error"
          message={errors.defaultAddress?.postalCode?.message}
        />
      </label>

      <label
        className="grid min-w-0 gap-2 text-[.7rem] font-bold uppercase tracking-[.08em] sm:col-span-2"
        htmlFor="profile-country"
      >
        Country
        <input
          autoComplete="country-name"
          className="min-h-11 w-full rounded-md border border-border bg-background px-3 py-2 text-base font-normal normal-case tracking-normal text-foreground outline-none transition focus-visible:ring-2 focus-visible:ring-primary"
          id="profile-country"
          maxLength={100}
          aria-invalid={Boolean(errors.defaultAddress?.country)}
          aria-describedby={errors.defaultAddress?.country ? "profile-country-error" : undefined}
          {...register("defaultAddress.country", {
            validate: (value) => validateAddressField("country", value),
          })}
        />
        <FieldError id="profile-country-error" message={errors.defaultAddress?.country?.message} />
      </label>

      <label className="grid min-w-0 gap-2 text-sm font-medium" htmlFor="profile-phone">
        Phone
        <input
          autoComplete="tel"
          className="min-h-11 w-full rounded-md border border-border bg-background px-3 py-2 text-base text-foreground outline-none transition focus-visible:ring-2 focus-visible:ring-primary"
          id="profile-phone"
          maxLength={50}
          type="tel"
          aria-invalid={Boolean(errors.phone)}
          aria-describedby={
            errors.phone ? "profile-phone-error profile-phone-help" : "profile-phone-help"
          }
          {...register("phone", { validate: (value) => validateField("phone", value) })}
        />
        <span className="text-xs text-muted-foreground" id="profile-phone-help">
          Use an international format when possible, e.g. +1 (555) 000-0000.
        </span>
        <FieldError id="profile-phone-error" message={errors.phone?.message} />
      </label>

      <div className="flex flex-wrap items-center gap-4 sm:col-span-2">
        <button
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-wait disabled:opacity-60"
          aria-busy={isSubmitting}
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting && <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />}
          {isSubmitting ? "Saving profile..." : "Save profile"}
        </button>
        <p
          className={`min-h-5 text-sm ${status.type === "error" ? "text-destructive" : "text-muted-foreground"}`}
          role={status.type === "error" ? "alert" : "status"}
          aria-live={status.type === "error" ? "assertive" : "polite"}
          aria-atomic="true"
        >
          {status.message}
        </p>
      </div>
    </form>
  );
}
