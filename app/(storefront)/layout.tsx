import { SiteShell } from "@/components/SiteShell";

export default function StorefrontLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <SiteShell>{children}</SiteShell>;
}
