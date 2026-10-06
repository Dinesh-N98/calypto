import type { Metadata } from "next";
import "aos/dist/aos.css";
import "./globals.css";
import { AuthSessionProvider } from "@/components/SessionProvider";
import { ToastProvider } from "@/components/ToastProvider";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.calyptobait.com"),
  title: {
    default: "calypto | Soft Baits That Fish Can't Ignore",
    template: "%s | calypto",
  },
  description: "calypto performance soft plastics for serious anglers.",
  icons: {
    icon: [
      { url: "/favicon.svg?v=2", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    shortcut: "/favicon.svg?v=2",
    apple: "/favicon.svg?v=2",
  },
  openGraph: {
    type: "website",
    siteName: "calypto",
    title: "calypto | Soft Baits That Fish Can't Ignore",
    description: "calypto performance soft plastics for serious anglers.",
  },
  twitter: {
    card: "summary",
    title: "calypto | Soft Baits That Fish Can't Ignore",
    description: "calypto performance soft plastics for serious anglers.",
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
