"use client";

import Link from "next/link";
import { LogOut, Menu, Store } from "lucide-react";
import { signOut } from "next-auth/react";

type AdminHeaderProps = {
  onMenuClick: () => void;
  user: { name: string | null; email: string };
};

export function AdminHeader({ onMenuClick, user }: AdminHeaderProps) {
  const displayName = user.name?.trim() || user.email;

  return (
    <header className="sticky top-0 z-30 flex h-[4.5rem] items-center justify-between border-b border-black/10 bg-white px-4 sm:px-8 lg:px-10">
      <div className="flex items-center gap-3">
        <button
          aria-label="Open navigation menu"
          className="grid h-10 w-10 place-items-center rounded-md text-[#42463b] hover:bg-black/5 lg:hidden"
          onClick={onMenuClick}
          type="button"
        >
          <Menu aria-hidden="true" className="h-5 w-5" />
        </button>
        <div>
          <p className="text-[.6rem] font-bold uppercase tracking-[.13em] text-[#73786b]">
            Calypto
          </p>
          <p className="hidden text-sm font-bold sm:block">Administration</p>
        </div>
      </div>

      <div className="flex items-center gap-3 sm:gap-5">
        <Link
          className="hidden items-center gap-2 text-xs font-bold text-[#55594f] hover:text-black sm:inline-flex"
          href="/"
        >
          <Store aria-hidden="true" className="h-4 w-4" />
          Storefront
        </Link>
        <div className="hidden text-right sm:block">
          <p className="max-w-48 truncate text-sm font-bold">{displayName}</p>
          <p className="max-w-48 truncate text-xs text-[#73786b]">{user.email}</p>
        </div>
        <button
          className="inline-flex min-h-10 items-center gap-2 rounded-md border border-black/15 px-3 text-xs font-bold text-[#33362f] transition-colors hover:bg-[#f4f5f1]"
          onClick={() => signOut({ callbackUrl: "/" })}
          type="button"
        >
          <LogOut aria-hidden="true" className="h-4 w-4" />
          <span className="hidden sm:inline">Sign out</span>
        </button>
      </div>
    </header>
  );
}
