"use client";

import { SessionProvider } from "next-auth/react";
import { CustomerProfileProvider } from "@/components/CustomerProfileProvider";

export function AuthSessionProvider({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <CustomerProfileProvider>{children}</CustomerProfileProvider>
    </SessionProvider>
  );
}
