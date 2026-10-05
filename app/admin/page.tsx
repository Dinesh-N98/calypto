import { requireAdminPage } from "@/lib/admin";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const admin = await requireAdminPage("/admin");

  return (
    <main className="min-h-[60vh] bg-ink px-[7vw] py-16 text-paper md:px-[10vw] md:py-24">
      <h1 className="text-3xl font-black uppercase tracking-[-.04em]">Admin</h1>
      <p className="mt-4 text-muted">{admin.name?.trim() || admin.email}</p>
    </main>
  );
}
