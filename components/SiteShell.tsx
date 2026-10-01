"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { CartProvider } from "@/components/CartProvider";
import { CookieBanner } from "@/components/CookieBanner";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";

const AOSInitializer = dynamic(
  () => import("@/components/AOSInitializer").then((module) => module.AOSInitializer),
  { loading: () => null },
);
const NewsletterPopup = dynamic(
  () => import("@/components/NewsletterPopup").then((module) => module.NewsletterPopup),
  { loading: () => null },
);

export function SiteShell({ children }: { children: React.ReactNode }) {
  const [loadDeferredComponents, setLoadDeferredComponents] = useState(false);

  useEffect(() => {
    const timeout = window.setTimeout(() => setLoadDeferredComponents(true), 0);
    return () => window.clearTimeout(timeout);
  }, []);

  return (
    <CartProvider>
      <Header />
      {children}
      <Footer />
      <CookieBanner />
      {loadDeferredComponents && (
        <>
          <AOSInitializer />
          <NewsletterPopup />
        </>
      )}
    </CartProvider>
  );
}
