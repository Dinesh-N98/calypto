"use client";

import { useState } from "react";
import { z } from "zod";
import { useForm, useWatch } from "react-hook-form";
import { LoaderCircle } from "lucide-react";
import { useToast } from "@/components/ToastProvider";

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password.").max(256),
    newPassword: z
      .string()
      .min(8, "Use at least 8 characters.")
      .max(256, "Password must be 256 characters or fewer.")
      .regex(/[0-9]/, "Include at least one number.")
      .regex(/[^A-Za-z0-9\s]/, "Include at least one symbol."),
    confirmPassword: z.string().min(1, "Confirm your new password."),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match.",
  });

type PasswordFormValues = z.input<typeof passwordSchema>;
type PasswordField = keyof PasswordFormValues;

function PasswordFieldError({ id, message }: { id: string; message?: string }) {
  return message ? (
    <p className="mt-1 text-xs text-destructive" id={id}>
      {message}
    </p>
  ) : null;
}

export function PasswordChangeForm() {
  const { showToast } = useToast();
  const [statusMessage, setStatusMessage] = useState("");
  const {
    register,
    handleSubmit,
    reset,
    setError,
    control,
    formState: { errors, isSubmitting },
  } = useForm<PasswordFormValues>({
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
    mode: "onChange",
    reValidateMode: "onChange",
  });

  const currentPassword = useWatch({ control, name: "currentPassword" });
  const newPassword = useWatch({ control, name: "newPassword" });
  const confirmPassword = useWatch({ control, name: "confirmPassword" });
  const passwordRequirements = [
    { label: "At least 8 characters", met: newPassword.length >= 8 },
    { label: "At least one number", met: /[0-9]/.test(newPassword) },
    { label: "At least one symbol", met: /[^A-Za-z0-9\s]/.test(newPassword) },
  ];
  const strength = passwordRequirements.filter((requirement) => requirement.met).length;

  function validateField(field: PasswordField, value: string): true | string {
    const fieldSchema = passwordSchema.shape[field];
    const parsed = fieldSchema.safeParse(value);
    if (!parsed.success) return parsed.error.issues[0]?.message ?? "Check this field.";
    if (field === "confirmPassword" && value !== newPassword) return "Passwords do not match.";
    return true;
  }

  async function submit(values: PasswordFormValues) {
    setStatusMessage("");
    const validated = passwordSchema.safeParse(values);
    if (!validated.success) {
      for (const issue of validated.error.issues) {
        const field = issue.path[0];
        if (field === "currentPassword" || field === "newPassword" || field === "confirmPassword") {
          setError(field, { type: "validation", message: issue.message });
        }
      }
      return;
    }

    try {
      const response = await fetch("/api/profile/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: validated.data.currentPassword,
          newPassword: validated.data.newPassword,
        }),
      });
      const result: unknown = await response.json();
      if (!response.ok) {
        const message =
          result &&
          typeof result === "object" &&
          "error" in result &&
          typeof result.error === "string"
            ? result.error
            : "Unable to update your password.";
        const normalizedMessage = message.toLowerCase();
        if (normalizedMessage.includes("current password")) {
          setError("currentPassword", { type: "server", message });
        } else if (normalizedMessage.includes("new password")) {
          setError("newPassword", { type: "server", message });
        } else {
          setError("root.serverError", { type: "server", message });
        }
        return;
      }

      reset();
      setStatusMessage("Password updated.");
      showToast("Password updated.");
    } catch {
      setError("root.serverError", {
        type: "server",
        message: "Unable to update your password. Check your connection and try again.",
      });
    }
  }

  const strengthLabel =
    strength === 3
      ? "Strong"
      : strength === 2
        ? "Getting stronger"
        : strength === 1
          ? "Weak"
          : "Not set";

  return (
    <form className="grid w-full gap-5" noValidate onSubmit={handleSubmit(submit)}>
      <label className="grid min-w-0 gap-2 text-sm font-medium" htmlFor="current-password">
        Current password
        <input
          autoComplete="current-password"
          className="min-h-11 w-full rounded-md border border-border bg-background px-3 py-2 text-base text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary"
          id="current-password"
          maxLength={256}
          type="password"
          aria-invalid={Boolean(errors.currentPassword)}
          aria-describedby={errors.currentPassword ? "current-password-error" : undefined}
          {...register("currentPassword", {
            validate: (value) => validateField("currentPassword", value),
          })}
        />
        <PasswordFieldError id="current-password-error" message={errors.currentPassword?.message} />
      </label>

      <div className="grid min-w-0 gap-3">
        <label className="grid min-w-0 gap-2 text-sm font-medium" htmlFor="new-password">
          New password
          <input
            autoComplete="new-password"
            className="min-h-11 w-full rounded-md border border-border bg-background px-3 py-2 text-base text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary"
            id="new-password"
            maxLength={256}
            type="password"
            aria-invalid={Boolean(errors.newPassword)}
            aria-describedby={`password-requirements${errors.newPassword ? " new-password-error" : ""}`}
            {...register("newPassword", {
              validate: (value) => validateField("newPassword", value),
              deps: "confirmPassword",
            })}
          />
          <PasswordFieldError id="new-password-error" message={errors.newPassword?.message} />
        </label>

        <div id="password-requirements" aria-live="polite">
          <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
            <span>Password strength</span>
            <span>{strengthLabel}</span>
          </div>
          <div
            className="mt-2 h-1.5 overflow-hidden rounded-full bg-border"
            role="meter"
            aria-label="Password strength"
            aria-valuemin={0}
            aria-valuemax={3}
            aria-valuenow={strength}
            aria-valuetext={strengthLabel}
          >
            <div
              className={`h-full transition-[width,background-color] ${
                strength === 3 ? "bg-primary" : strength === 2 ? "bg-amber-500" : "bg-destructive"
              }`}
              style={{ width: `${(strength / 3) * 100}%` }}
            />
          </div>
          <ul className="mt-2 grid gap-1 text-xs text-muted-foreground sm:grid-cols-3">
            {passwordRequirements.map(({ label, met }) => (
              <li className={met ? "text-primary" : undefined} key={label}>
                <span aria-hidden="true">{met ? "✓" : "○"}</span> {label}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <label className="grid min-w-0 gap-2 text-sm font-medium" htmlFor="confirm-password">
        Confirm new password
        <input
          autoComplete="new-password"
          className="min-h-11 w-full rounded-md border border-border bg-background px-3 py-2 text-base text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary"
          id="confirm-password"
          maxLength={256}
          type="password"
          aria-invalid={Boolean(errors.confirmPassword)}
          aria-describedby={errors.confirmPassword ? "confirm-password-error" : undefined}
          {...register("confirmPassword", {
            validate: (value) =>
              value.length > 0
                ? value === newPassword || "Passwords do not match."
                : "Confirm your new password.",
          })}
        />
        <PasswordFieldError id="confirm-password-error" message={errors.confirmPassword?.message} />
      </label>

      {errors.root?.serverError?.message && (
        <p className="text-sm text-destructive" role="alert">
          {errors.root.serverError.message}
        </p>
      )}
      {statusMessage && (
        <p className="text-sm text-primary" role="status" aria-live="polite">
          {statusMessage}
        </p>
      )}

      <button
        className="inline-flex min-h-11 w-fit items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-wait disabled:opacity-60"
        aria-busy={isSubmitting}
        disabled={
          isSubmitting ||
          !currentPassword ||
          passwordRequirements.some((requirement) => !requirement.met) ||
          !confirmPassword ||
          confirmPassword !== newPassword
        }
        type="submit"
      >
        {isSubmitting && <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />}
        {isSubmitting ? "Updating password..." : "Update password"}
      </button>
    </form>
  );
}
