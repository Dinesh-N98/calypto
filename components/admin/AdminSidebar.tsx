"use client";

import Link from "next/link";
import { Box, LayoutDashboard, ShoppingCart, Store, Tags, UsersRound, X } from "lucide-react";
import { usePathname } from "next/navigation";

type AdminSidebarProps = {
  isOpen: boolean;
  onNavigate: () => void;
  onClose: () => void;
};

const navigationItems = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Products", href: "/admin/products", icon: Box },
  { label: "Categories", href: "/admin/categories", icon: Tags },
  { label: "Orders", href: "/admin/orders", icon: ShoppingCart },
  { label: "Customers", href: "/admin#customers", icon: UsersRound },
];

export function AdminSidebar({ isOpen, onNavigate, onClose }: AdminSidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {isOpen && (
        <button
          aria-label="Close navigation menu"
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
          type="button"
        />
      )}
      <aside
        aria-label="Admin sidebar"
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-[#171a14] px-5 py-6 text-white transition-transform duration-200 lg:sticky lg:top-0 lg:h-screen lg:w-auto lg:translate-x-0 ${isOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex items-center justify-between">
          <Link className="text-lg font-black tracking-[.12em]" href="/admin" onClick={onNavigate}>
            CALYPTO<span className="text-[#a3bd32]"> ADMIN</span>
          </Link>
          <button
            aria-label="Close navigation menu"
            className="grid h-10 w-10 place-items-center rounded-md text-white/70 hover:bg-white/10 hover:text-white lg:hidden"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" className="h-5 w-5" />
          </button>
        </div>

        <p className="mb-3 mt-10 px-3 text-[.65rem] font-bold uppercase tracking-[.14em] text-white/45">
          Workspace
        </p>
        <nav aria-label="Admin navigation" className="grid gap-1">
          {navigationItems.map(({ label, href, icon: Icon }) => {
            const isActive =
              href === "/admin"
                ? pathname === "/admin"
                : pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                aria-current={isActive ? "page" : undefined}
                className={`flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-semibold transition-colors ${isActive ? "bg-[#a3bd32] text-[#171a14]" : "text-white/75 hover:bg-white/10 hover:text-white"}`}
                href={href}
                key={href}
                onClick={onNavigate}
              >
                <Icon aria-hidden="true" className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto border-t border-white/10 pt-4">
          <Link
            className="flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-semibold text-white/65 transition-colors hover:bg-white/10 hover:text-white"
            href="/"
            onClick={onNavigate}
          >
            <Store aria-hidden="true" className="h-4 w-4" />
            View storefront
          </Link>
        </div>
      </aside>
    </>
  );
}
