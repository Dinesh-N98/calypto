import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Reveal } from "@/components/Reveal";
import { ProfileForm } from "@/components/ProfileForm";
import { SignOutButton } from "@/components/SignOutButton";
import { prisma } from "@/lib/prisma";

export default async function AccountPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, email: true, address: true, phone: true },
  });
  if (!user) redirect("/sign-in");

  const orders = await prisma.order.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { items: true } } },
  });

  return (
    <main className="bg-paper px-[7vw] py-12 text-ink md:px-[10vw] md:py-20">
      <Reveal as="section" className="mx-auto max-w-5xl">
        <p className="text-[.6rem] font-bold uppercase tracking-[.15em] text-[#65771b]">Account</p>
        <h1 className="my-4 text-[clamp(2.65rem,9vw,3.8rem)] font-black uppercase leading-[.92] tracking-[-.07em] md:my-5 md:text-[clamp(3.5rem,6vw,6rem)]">
          {user.name || "Your"}
          <br />
          <em className="text-[#829b22] not-italic">profile.</em>
        </h1>
        <div className="grid gap-8 border-t border-[rgba(13,14,12,.18)] pt-6 md:grid-cols-[1fr_1.2fr] md:gap-12 md:pt-8">
          <section>
            <p className="mb-5 text-[.65rem] font-bold uppercase tracking-[.15em] text-[#65771b]">
              Saved info
            </p>
            <p className="text-xl font-bold">{user.name || "Calypto angler"}</p>
            <p className="mt-2 text-muted">{user.email}</p>
            <div className="mt-8">
              <ProfileForm address={user.address || ""} phone={user.phone || ""} />
            </div>
          </section>
          <section className="border-t border-[rgba(13,14,12,.18)] pt-6 md:border-l md:border-t-0 md:pl-10 md:pt-0">
            <p className="text-[.65rem] font-bold uppercase tracking-[.15em] text-[#65771b]">
              Order history
            </p>
            {orders.length === 0 ? (
              <>
                <h2 className="mt-5 text-2xl font-black uppercase tracking-[-.04em] md:text-3xl">
                  No orders yet.
                </h2>
                <p className="mt-4 max-w-md leading-[1.6] text-[#55584e]">
                  Order history will appear here once you&apos;ve placed an order.
                </p>
              </>
            ) : (
              <div className="mt-5 grid gap-4">
                {orders.map((order) => (
                  <article className="border-b border-[rgba(13,14,12,.14)] pb-4" key={order.id}>
                    <div className="flex items-baseline justify-between gap-4">
                      <h2 className="font-bold uppercase">
                        {new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(
                          order.createdAt,
                        )}
                      </h2>
                      <strong>
                        {new Intl.NumberFormat("en-US", {
                          style: "currency",
                          currency: "USD",
                        }).format(order.totalCents / 100)}
                      </strong>
                    </div>
                    <p className="mt-2 text-sm text-[#55584e]">
                      {order._count.items} {order._count.items === 1 ? "item" : "items"} ·{" "}
                      {order.status}
                    </p>
                  </article>
                ))}
              </div>
            )}
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                className="button-primary inline-flex items-center justify-center gap-3 px-5 py-4 text-[.7rem] tracking-[.1em] text-paper"
                href="/shop"
              >
                Browse the lineup{" "}
                <ArrowUpRight aria-hidden="true" className="h-4 w-4 shrink-0" strokeWidth={2} />
              </Link>
              <SignOutButton />
            </div>
          </section>
        </div>
      </Reveal>
    </main>
  );
}
