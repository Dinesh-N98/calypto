import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AccountNavigation } from "@/components/account/AccountNavigation";
import { SignOutButton } from "@/components/SignOutButton";

export default async function AccountLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in?callbackUrl=%2Faccount");

  return (
    <main className="box-border min-h-[60vh] w-full max-w-full overflow-x-hidden bg-background px-4 py-8 text-foreground sm:px-6 md:px-[5vw] md:py-14">
      <div className="site-container mx-auto w-full max-w-full">
        <div className="mb-7 flex flex-col gap-3 border-b border-border pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[.65rem] font-bold uppercase tracking-[.15em] text-primary">
                Calypto customer portal
              </p>
              <div className="sm:hidden">
                <SignOutButton />
              </div>
            </div>
            <Link
              className="mt-2 inline-flex min-h-11 items-center text-sm font-bold uppercase tracking-[.08em] text-foreground underline decoration-primary underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
              href="/shop"
            >
              Continue shopping
            </Link>
          </div>
          <div className="hidden sm:block">
            <SignOutButton />
          </div>
        </div>
        <div className="grid w-full min-w-0 grid-cols-1 gap-4 md:grid-cols-[13rem_minmax(0,1fr)] md:gap-12">
          <aside className="grid w-full min-w-0 content-start gap-4">
            <AccountNavigation />
          </aside>
          <div className="min-w-0">{children}</div>
        </div>
      </div>
    </main>
  );
}
