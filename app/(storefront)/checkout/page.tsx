import { auth } from "@/auth";
import CartPageClient from "@/components/CartPageClient";
import type { CheckoutAddress, CheckoutProfile } from "@/components/CheckoutForm";
import { prisma } from "@/lib/prisma";

export default async function CheckoutPage({
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
  const user = userId
    ? await prisma.user.findUnique({
        where: { id: userId },
        select: {
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          addresses: {
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
          },
        },
      })
    : null;
  const profile: CheckoutProfile | null = user
    ? {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
      }
    : null;
  const savedAddresses: CheckoutAddress[] = user?.addresses ?? [];
  const defaultAddress =
    savedAddresses.find((address) => address.isDefault) ?? savedAddresses[0] ?? null;

  return (
    <CartPageClient
      defaultAddress={defaultAddress}
      profile={profile}
      isAuthenticated={Boolean(userId)}
      buyNowVariantId={params.buyNow}
      buyNowQuantity={buyNowQuantity}
      savedAddresses={savedAddresses}
      startAtCheckout
    />
  );
}
