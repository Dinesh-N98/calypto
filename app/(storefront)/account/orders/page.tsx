import { auth } from "@/auth";
import { AccountOrderList } from "@/components/account/AccountOrderList";
import { prisma } from "@/lib/prisma";

export default async function AccountOrdersPage() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;

  const orders = await prisma.order.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: { items: { orderBy: { id: "asc" } } },
  });

  return (
    <section aria-labelledby="account-orders-title">
      <p className="text-[.65rem] font-bold uppercase tracking-[.15em] text-olive">Your account</p>
      <h1 className="mt-3 break-words text-2xl font-black uppercase tracking-[-.06em] sm:text-4xl lg:text-5xl" id="account-orders-title">
        Order history
      </h1>
      <p className="mb-7 mt-2 text-sm text-[#55584e]">
        Select an order to see its items, tracking details, invoice, and reorder options.
      </p>
      <AccountOrderList orders={orders} />
    </section>
  );
}
