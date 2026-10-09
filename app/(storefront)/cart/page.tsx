import { auth } from "@/auth";
import CartPageClient from "@/components/CartPageClient";
import type { CheckoutAddress } from "@/components/CheckoutForm";
import { prisma } from "@/lib/prisma";

export default async function CartPage({
  searchParams,
}: {
  searchParams: Promise<{ buyNow?: string; quantity?: string }>;
}) {
  const params = await searchParams;
  const requestedQuantity = Number(params.quantity);
  const buyNowQuantity =
    Number.isSafeInteger(requestedQuantity) && requestedQuantity > 0
      ? Math.min(requestedQuantity, 2_147_483_647)
      : 1;
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
      buyNowVariantId={params.buyNow}
      buyNowQuantity={buyNowQuantity}
      savedAddresses={savedAddresses}
    />
  );
}
