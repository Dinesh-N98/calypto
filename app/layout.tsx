import type { Metadata } from "next";
import "aos/dist/aos.css";
import "./globals.css";
import { AuthSessionProvider } from "@/components/SessionProvider";
import { ToastProvider } from "@/components/ToastProvider";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.calyptobait.com"),
  title: {
    default: "Calypto | Soft Baits That Fish Can't Ignore",
    template: "%s | Calypto",
  },
  description: "Performance soft plastics for serious anglers.",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    shortcut: "/favicon.ico",
    apple: "/favicon.svg",
  },
  openGraph: {
    type: "website",
    siteName: "Calypto",
    title: "Calypto | Soft Baits That Fish Can't Ignore",
    description: "Performance soft plastics for serious anglers.",
  },
  twitter: {
    card: "summary",
    title: "Calypto | Soft Baits That Fish Can't Ignore",
    description: "Performance soft plastics for serious anglers.",
  },
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <AuthSessionProvider>
          <ToastProvider>{children}</ToastProvider>
        </AuthSessionProvider>
      </body>
    </html>
  );
}
