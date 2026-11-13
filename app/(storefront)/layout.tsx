import { SiteShell } from "@/components/SiteShell";
import { getShopCategories } from "@/lib/shop-catalog";

export const dynamic = "force-dynamic";

export default async function StorefrontLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const categories = await getShopCategories();
  return <SiteShell categories={categories}>{children}</SiteShell>;
}
