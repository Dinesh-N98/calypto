import type { Metadata } from "next";
import { NewsletterAction } from "@/components/NewsletterAction";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata: Metadata = {
  title: "Unsubscribe | Calypto",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function NewsletterUnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return <NewsletterAction action="unsubscribe" token={token ?? ""} />;
}
