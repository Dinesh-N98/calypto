"use client";

import { CartProvider } from "@/components/CartProvider";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";

export function SiteShell({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      <Header />
      {children}
      <Footer />
    </CartProvider>
  );
}
