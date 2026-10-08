"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { signOut } from "next-auth/react";
import { LoaderCircle, TriangleAlert } from "lucide-react";

export function DangerZoneCard() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen && !dialog.open) dialog.showModal();
    if (!isOpen && dialog.open) dialog.close();
  }, [isOpen]);

  function openDialog() {
    setConfirmation("");
    setError("");
    setIsOpen(true);
  }

  function closeDialog() {
    if (isDeleting) return;
    setIsOpen(false);
  }

  async function deleteAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (confirmation !== "DELETE") {
      setError('Type "DELETE" exactly to confirm account deletion.');
      return;
    }

    setIsDeleting(true);
    setError("");
    try {
      const response = await fetch("/api/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation }),
      });
      const result: unknown = await response.json();
      if (!response.ok) {
        const message =
          result &&
          typeof result === "object" &&
          "error" in result &&
          typeof result.error === "string"
            ? result.error
            : "Unable to delete your account.";
        throw new Error(message);
      }

      await signOut({ callbackUrl: "/sign-in?accountDeleted=1" });
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Unable to delete your account. Please try again.",
      );
      setIsDeleting(false);
    }
  }

  return (
    <>
      <section
        aria-labelledby="danger-zone-title"
        className="rounded-xl border border-destructive/30 bg-destructive/5 p-5 shadow-sm sm:p-6"
      >
        <div className="flex items-start gap-3">
          <TriangleAlert aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-foreground" id="danger-zone-title">
              Delete account
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Permanently remove your profile, saved addresses, and connected sign-in credentials.
              Historical order records will be retained by the store and detached from your account.
              This action cannot be undone.
            </p>
            <button
              className="mt-5 inline-flex min-h-11 items-center justify-center rounded-md border border-destructive px-4 py-2 text-sm font-semibold text-destructive transition hover:bg-destructive hover:text-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-destructive"
              onClick={openDialog}
              type="button"
            >
              Delete account
            </button>
          </div>
        </div>
      </section>

      <dialog
        aria-labelledby="delete-account-dialog-title"
        aria-describedby="delete-account-dialog-description"
        className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-xl border border-border bg-card p-0 text-foreground shadow-xl backdrop:bg-black/60"
        onCancel={(event) => {
          if (isDeleting) event.preventDefault();
          else setIsOpen(false);
        }}
        onClose={() => setIsOpen(false)}
        onClick={(event) => {
          if (event.target === event.currentTarget) closeDialog();
        }}
        ref={dialogRef}
      >
        <form className="grid gap-5 p-5 sm:p-6" onSubmit={deleteAccount}>
          <div>
            <h2 className="text-xl font-bold" id="delete-account-dialog-title">
              Permanently delete your account?
            </h2>
            <p
              className="mt-2 text-sm leading-6 text-muted-foreground"
              id="delete-account-dialog-description"
            >
              Your profile and saved addresses will be deleted. Historical order records will remain
              with the store. Type <strong className="text-foreground">DELETE</strong> below to
              continue.
            </p>
          </div>

          <label className="grid gap-2 text-sm font-medium" htmlFor="delete-account-confirmation">
            Type DELETE to confirm
            <span className="sr-only" id="delete-account-help">
              Enter the uppercase word DELETE exactly.
            </span>
            <input
              autoComplete="off"
              autoFocus
              className="min-h-11 rounded-md border border-border bg-background px-3 py-2 text-base text-foreground outline-none focus-visible:ring-2 focus-visible:ring-destructive"
              id="delete-account-confirmation"
              onChange={(event) => {
                setConfirmation(event.target.value);
                setError("");
              }}
              value={confirmation}
              aria-invalid={Boolean(error && confirmation !== "DELETE")}
              aria-describedby={`delete-account-help${error && confirmation !== "DELETE" ? " delete-account-error" : ""}`}
              disabled={isDeleting}
            />
          </label>

          {error && (
            <p className="text-sm text-destructive" id="delete-account-error" role="alert">
              {error}
            </p>
          )}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              className="min-h-11 rounded-md border border-border px-4 py-2 text-sm font-semibold transition hover:bg-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              disabled={isDeleting}
              onClick={closeDialog}
              type="button"
            >
              Cancel
            </button>
            <button
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-destructive px-4 py-2 text-sm font-semibold text-background transition hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-destructive disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isDeleting || confirmation !== "DELETE"}
              type="submit"
            >
              {isDeleting && <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />}
              {isDeleting ? "Deleting account..." : "Permanently delete account"}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
