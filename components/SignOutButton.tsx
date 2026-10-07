"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      className="min-h-11 border border-ink px-5 py-3 text-[.7rem] font-extrabold uppercase tracking-[.1em] text-ink hover:bg-ink hover:text-paper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#65771b]"
      type="button"
      onClick={() => signOut({ callbackUrl: "/" })}
    >
      Sign out
    </button>
  );
}