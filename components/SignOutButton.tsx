"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      className="border border-ink px-5 py-4 text-[.7rem] font-extrabold uppercase tracking-[.1em] text-ink hover:bg-ink hover:text-paper"
      type="button"
      onClick={() => signOut({ callbackUrl: "/" })}
    >
      Sign out
    </button>
  );
}