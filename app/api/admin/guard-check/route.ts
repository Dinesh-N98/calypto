// TEMPORARY verification route. Remove before Phase 2.
import { requireAdminRequest } from "@/lib/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  const result = await requireAdminRequest();
  if (!result.ok) return result.response;

  return Response.json({ id: result.user.id, role: result.user.role });
}
