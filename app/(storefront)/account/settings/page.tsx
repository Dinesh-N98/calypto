import { auth } from "@/auth";
import { PasswordChangeForm } from "@/components/account/PasswordChangeForm";
import { DangerZoneCard } from "@/components/account/DangerZoneCard";
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
      emailVerified: true,
      firstName: true,
      lastName: true,
      address: true,
      phone: true,
      hashedPassword: true,
      accounts: { select: { provider: true } },
    },
  });
  if (!user) return null;

  const hasExternalProvider = user.accounts.length > 0;
  const connectedSignIn = hasExternalProvider
    ? user.accounts.map((account) => account.provider).join(", ")
    : user.hashedPassword
      ? "Email and password"
      : "External identity provider";

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[.15em] text-primary">
          Your account
        </p>
        <h1
          className="mt-2 break-words text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
          id="account-settings-title"
        >
          Profile & security
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Manage your profile, sign-in methods, and account data.
        </p>
      </header>

      <section
        aria-labelledby="profile-details-title"
        className="rounded-xl border border-border bg-card p-5 shadow-sm sm:p-6"
      >
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-foreground" id="profile-details-title">
            Profile details
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Keep the information associated with your account up to date.
          </p>
        </div>

        <div className="mb-6 rounded-lg border border-border bg-background p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">Sign-in email</span>
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                user.emailVerified
                  ? "bg-primary/10 text-primary"
                  : "bg-muted-foreground/10 text-muted-foreground"
              }`}
            >
              {user.emailVerified ? "Verified" : "Not verified"}
            </span>
          </div>
          <p className="mt-2 break-all text-sm font-medium text-foreground">{user.email}</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            To update your account email, contact support or manage via your identity provider.
          </p>
        </div>

        <ProfileForm
          firstName={user.firstName || ""}
          lastName={user.lastName || ""}
          address={user.address || ""}
          phone={user.phone || ""}
        />
      </section>

      <section
        aria-labelledby="password-title"
        className="rounded-xl border border-border bg-card p-5 shadow-sm sm:p-6"
      >
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-foreground" id="password-title">
            Password
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Connected sign-in:{" "}
            <span className="font-medium text-foreground">{connectedSignIn}</span>
          </p>
        </div>
        {user.hashedPassword ? (
          <PasswordChangeForm />
        ) : (
          <p className="rounded-lg border border-border bg-background p-4 text-sm leading-6 text-muted-foreground">
            This account does not use a Calypto password. Manage your credentials with your
            connected sign-in provider.
          </p>
        )}
      </section>

      <section
        aria-labelledby="security-title"
        className="rounded-xl border border-border bg-card p-5 shadow-sm sm:p-6"
      >
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-foreground" id="security-title">
            Security & sessions
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Review available sign-in protections and session controls.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-border bg-background p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-semibold text-foreground">Two-factor authentication</h3>
              {hasExternalProvider && (
                <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                  Provider linked
                </span>
              )}
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {hasExternalProvider
                ? "Calypto does not manage two-factor settings for your connected provider. Check that provider's security settings for available options."
                : "Two-factor authentication is not currently available in Calypto."}
            </p>
          </div>

          <div className="rounded-lg border border-border bg-background p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-semibold text-foreground">Passkeys</h3>
              {hasExternalProvider && (
                <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                  Provider linked
                </span>
              )}
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {hasExternalProvider
                ? "Passkeys are not managed in Calypto. Your connected provider may offer passkey settings."
                : "Passkey sign-in is not currently available in Calypto."}
            </p>
          </div>

          <div className="rounded-lg border border-border bg-background p-4 sm:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-semibold text-foreground">Active sessions</h3>
              <span className="rounded-full bg-muted-foreground/10 px-2.5 py-1 text-xs font-medium text-muted-foreground">
                Session controls unavailable
              </span>
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              This account uses stateless sign-in sessions, so Calypto cannot list or revoke other
              sessions individually.
            </p>
            <button
              className="mt-4 inline-flex min-h-11 items-center justify-center rounded-md border border-border px-4 py-2 text-sm font-medium text-muted-foreground"
              disabled
              type="button"
            >
              Log out all other sessions
            </button>
          </div>
        </div>
      </section>

      <DangerZoneCard />
    </div>
  );
}
