import { auth } from "@/auth";
import CartPageClient from "@/components/CartPageClient";
import type { CheckoutAddress } from "@/components/CheckoutForm";
import { prisma } from "@/lib/prisma";

export default async function CartPage() {
  const session = await auth();
  const userId = session?.user?.id;
  const savedAddresses: CheckoutAddress[] = userId
    ? await prisma.address.findMany({
        where: { userId },
        orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
        select: {
          id: true,
          line1: true,
          line2: true,
          city: true,
          state: true,
          postalCode: true,
          country: true,
          isDefault: true,
        },
      })
    : [];
  const defaultAddress =
    savedAddresses.find((address) => address.isDefault) ?? savedAddresses[0] ?? null;

  return (
    <CartPageClient
      defaultAddress={defaultAddress}
      isAuthenticated={Boolean(userId)}
      savedAddresses={savedAddresses}
    />
  );
}
