import { auth } from "@/auth";
import { AddressManager } from "@/components/account/AddressManager";
import { prisma } from "@/lib/prisma";

export default async function AccountAddressesPage() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;

  const addresses = await prisma.address.findMany({
    where: { userId },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      line1: true,
      line2: true,
      city: true,
      postalCode: true,
      country: true,
      isDefault: true,
    },
  });

  return (
    <section aria-labelledby="account-addresses-title">
      <p className="text-[.65rem] font-bold uppercase tracking-[.15em] text-olive">Your account</p>
      <h1 className="mb-7 mt-3 break-words text-2xl font-black uppercase tracking-[-.06em] sm:text-4xl lg:text-5xl" id="account-addresses-title">
        Address book
      </h1>
      <AddressManager initialAddresses={addresses} />
    </section>
  );
}
