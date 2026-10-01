"use client";

import { CartProvider } from "@/components/CartProvider";
import { CookieBanner } from "@/components/CookieBanner";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { NewsletterPopup } from "@/components/NewsletterPopup";

export function SiteShell({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      <Header />
      {children}
      <Footer />
      <NewsletterPopup />
      <CookieBanner />
    </CartProvider>
  );
}
