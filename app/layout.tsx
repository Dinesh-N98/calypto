import type { Metadata } from "next";
import "./globals.css";
import { SiteShell } from "@/components/SiteShell";
import { AuthSessionProvider } from "@/components/SessionProvider";
import { ToastProvider } from "@/components/ToastProvider";

export const metadata: Metadata = {
  title: "Calypto | Soft Baits That Fish Can't Ignore",
  description: "Performance soft plastics for serious anglers.",
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <AuthSessionProvider>
          <ToastProvider>
            <SiteShell>{children}</SiteShell>
          </ToastProvider>
        </AuthSessionProvider>
      </body>
    </html>
  );
}
