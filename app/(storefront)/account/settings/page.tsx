import { auth } from "@/auth";
import { PasswordChangeForm } from "@/components/account/PasswordChangeForm";
import { ProfileForm } from "@/components/ProfileForm";
import { prisma } from "@/lib/prisma";

export default async function AccountSettingsPage() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      email: true,
      firstName: true,
      lastName: true,
      address: true,
      phone: true,
      hashedPassword: true,
      accounts: { select: { provider: true } },
    },
  });
  if (!user) return null;

  return (
    <section aria-labelledby="account-settings-title">
      <p className="text-[.65rem] font-bold uppercase tracking-[.15em] text-olive">Your account</p>
      <h1 className="mt-3 break-words text-2xl font-black uppercase tracking-[-.06em] sm:text-4xl lg:text-5xl" id="account-settings-title">
        Profile & security
      </h1>

      <section aria-labelledby="profile-details-title" className="mt-7 border-t border-ink/15 pt-6">
        <h2 className="text-lg font-black uppercase" id="profile-details-title">Profile details</h2>
        <p className="mt-2 text-sm text-[#55584e]">
          Sign-in email: <strong className="text-ink">{user.email}</strong>
        </p>
        <div className="mt-5 box-border w-full max-w-xl">
          <ProfileForm
            firstName={user.firstName || ""}
            lastName={user.lastName || ""}
            address={user.address || ""}
            phone={user.phone || ""}
          />
        </div>
      </section>

      <section aria-labelledby="security-title" className="mt-8 border-t border-ink/15 pt-6">
        <h2 className="text-lg font-black uppercase" id="security-title">Sign-in & security</h2>
        <p className="mt-2 text-sm text-[#55584e]">
          Connected sign-in:{" "}
          {user.accounts.length > 0
            ? user.accounts.map((account) => account.provider).join(", ")
            : user.hashedPassword
              ? "Email and password"
              : "External identity provider"}
        </p>
        {user.hashedPassword ? (
          <PasswordChangeForm />
        ) : (
          <p className="mt-4 max-w-xl text-sm leading-6 text-[#55584e]">
            This account does not use a Calypto password. Manage credentials with your connected
            sign-in provider.
          </p>
        )}
        <p className="mt-4 max-w-xl text-xs leading-5 text-[#55584e]">
          Multi-factor authentication, active-session management, and recovery controls are not
          currently configured for this account.
        </p>
      </section>
    </section>
  );
}
