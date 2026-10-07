import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AccountNavigation } from "@/components/account/AccountNavigation";
import { SignOutButton } from "@/components/SignOutButton";

export default async function AccountLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in?callbackUrl=%2Faccount");

  return (
    <main className="min-h-[60vh] bg-paper px-4 py-8 text-ink sm:px-6 md:px-[5vw] md:py-14">
      <div className="site-container mx-auto max-w-7xl">
        <div className="mb-7 flex items-center justify-between gap-4 border-b border-ink/15 pb-5">
          <div>
            <p className="text-[.65rem] font-bold uppercase tracking-[.15em] text-olive">
              Calypto customer portal
            </p>
            <Link
              className="mt-2 inline-flex min-h-11 items-center text-sm font-bold uppercase tracking-[.08em] underline decoration-olive-bright underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-olive"
              href="/shop"
            >
              Continue shopping
            </Link>
          </div>
          <SignOutButton />
        </div>
        <div className="grid gap-8 md:grid-cols-[13rem_minmax(0,1fr)] md:gap-12">
          <aside className="grid content-start gap-4">
            <AccountNavigation />
          </aside>
          <div className="min-w-0">{children}</div>
        </div>
      </div>
    </main>
  );
}
