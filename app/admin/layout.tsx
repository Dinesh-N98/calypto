import { AdminShell } from "@/components/admin/AdminShell";
import { requireAdminPage } from "@/lib/admin";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const admin = await requireAdminPage("/admin");

  return (
    <AdminShell user={{ name: admin.name, email: admin.email }}>
      {children}
    </AdminShell>
  );
}
