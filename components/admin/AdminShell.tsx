"use client";

import { useState } from "react";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { usePathname } from "next/navigation";

type AdminShellProps = {
  children: React.ReactNode;
  user: { name: string | null; email: string };
};

export function AdminShell({ children, user }: AdminShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const isProductEditor =
    pathname === "/admin/products/new" || /^\/admin\/products\/[^/]+\/edit$/.test(pathname);

  return (
    <div
      className={`admin-shell flex h-[100dvh] min-h-0 overflow-hidden bg-[#f4f5f1] text-[#161812] lg:grid ${isProductEditor ? "lg:grid-cols-1" : "lg:grid-cols-[16rem_minmax(0,1fr)]"}`}
    >
      {!isProductEditor && (
        <AdminSidebar
          isOpen={sidebarOpen}
          onNavigate={() => setSidebarOpen(false)}
          onClose={() => setSidebarOpen(false)}
        />
      )}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        {!isProductEditor && <AdminHeader user={user} onMenuClick={() => setSidebarOpen(true)} />}
        <main
          className={
            isProductEditor
              ? "min-h-0 flex-1 overflow-hidden p-0"
              : "min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 py-6 sm:px-8 sm:py-8 lg:px-10 lg:py-8"
          }
        >
          {children}
        </main>
      </div>
    </div>
  );
}
