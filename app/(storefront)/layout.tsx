import { SiteShell } from "@/components/SiteShell";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function StorefrontLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
    select: { name: true, slug: true },
  });
  return <SiteShell categories={categories}>{children}</SiteShell>;
}
