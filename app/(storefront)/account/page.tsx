import Link from "next/link";
import { ArrowRight, MapPin, PackageCheck, Settings2 } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export default async function AccountOverviewPage() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;

  const [user, orders] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true, name: true },
    }),
    prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 6,
      select: {
        id: true,
        providerReference: true,
        status: true,
        fulfillmentStatus: true,
        trackingUrl: true,
        createdAt: true,
        totalCents: true,
        currency: true,
      },
    }),
  ]);

  const activeOrder = orders.find((order) => {
    const fulfillment = order.fulfillmentStatus?.toLowerCase();
    return (
      order.status === "pending" ||
      (order.status === "paid" && fulfillment !== "delivered" && fulfillment !== "cancelled")
    );
  });
  const greeting = user?.firstName || user?.name?.split(" ")[0] || "Angler";

  return (
    <div className="grid gap-8">
      <header className="border-b border-ink/15 pb-7">
        <p className="text-[.65rem] font-bold uppercase tracking-[.15em] text-[#65771b]">
          Your account
        </p>
        <h1 className="mt-3 text-4xl font-black uppercase leading-none tracking-[-.06em] sm:text-5xl">
          Welcome back, <span className="text-[#829b22]">{greeting}.</span>
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-[#55584e]">
          Your orders, saved delivery addresses, and account details are all in one place.
        </p>
      </header>

      {activeOrder ? (
        <section
          aria-label="Active order"
          className="flex flex-col justify-between gap-5 bg-ink p-5 text-paper sm:flex-row sm:items-center sm:p-7"
        >
          <div>
            <p className="text-[.65rem] font-bold uppercase tracking-[.15em] text-lime">
              Order update
            </p>
            <h2 className="mt-2 text-2xl font-black uppercase tracking-[-.04em]">
              {activeOrder.fulfillmentStatus || activeOrder.status}
            </h2>
            <p className="mt-1 text-sm text-paper/70">
              {activeOrder.providerReference} ·{" "}
              {new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(
                activeOrder.createdAt,
              )}
            </p>
          </div>
          <Link
            className="inline-flex min-h-11 items-center justify-center gap-2 border border-paper/40 px-4 text-[.65rem] font-bold uppercase tracking-[.08em] hover:bg-paper hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime"
            href="/account/orders"
          >
            View order <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        </section>
      ) : (
        <section className="border border-ink/15 bg-white/60 p-5 sm:p-7">
          <p className="text-[.65rem] font-bold uppercase tracking-[.15em] text-[#65771b]">
            Order update
          </p>
          <h2 className="mt-2 text-xl font-black uppercase">You’re all caught up.</h2>
          <p className="mt-2 text-sm text-[#55584e]">New order activity will appear here.</p>
        </section>
      )}

      <section aria-labelledby="recent-orders-title">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-black uppercase tracking-[-.03em]" id="recent-orders-title">
            Recent orders
          </h2>
          <Link
            className="text-[.65rem] font-bold uppercase tracking-[.08em] text-[#65771b] underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4"
            href="/account/orders"
          >
            All orders
          </Link>
        </div>
        {orders.length === 0 ? (
          <div className="border-t border-ink/15 py-6">
            <p className="text-sm text-[#55584e]">Your order history will appear here.</p>
            <Link className="mt-4 inline-flex text-sm font-bold underline underline-offset-4" href="/shop">
              Browse the shop
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-ink/15 border-y border-ink/15">
            {orders.slice(0, 3).map((order) => (
              <li className="flex flex-wrap items-center justify-between gap-3 py-4" key={order.id}>
                <div>
                  <p className="font-bold">{order.providerReference}</p>
                  <p className="mt-1 text-xs text-[#55584e]">
                    {new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(
                      order.createdAt,
                    )}{" "}
                    · {order.fulfillmentStatus || order.status}
                  </p>
                </div>
                <strong className="text-sm">
                  {new Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency: order.currency,
                  }).format(order.totalCents / 100)}
                </strong>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-label="Quick actions" className="grid gap-3 sm:grid-cols-3">
        <QuickAction href="/account/orders" icon={<PackageCheck aria-hidden="true" />} title="Orders" />
        <QuickAction href="/account/addresses" icon={<MapPin aria-hidden="true" />} title="Addresses" />
        <QuickAction
          href="/account/settings"
          icon={<Settings2 aria-hidden="true" />}
          title="Profile & security"
        />
      </section>
    </div>
  );
}

function QuickAction({
  href,
  icon,
  title,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <Link
      className="flex min-h-20 items-center justify-between gap-3 border border-ink/15 bg-white/60 p-4 text-sm font-bold uppercase tracking-[.04em] hover:border-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#65771b]"
      href={href}
    >
      <span className="flex items-center gap-3">
        {icon} {title}
      </span>
      <ArrowRight aria-hidden="true" className="h-4 w-4" />
    </Link>
  );
}
