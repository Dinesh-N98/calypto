import { notFound, redirect } from "next/navigation";
import type { UserRole } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getValidatedAdminReturnPath } from "@/lib/admin-return-path";

export type AdminUser = {
  id: string;
  name: string | null;
  email: string;
  role: UserRole;
};

type AdminRequestResult =
  | { ok: true; user: AdminUser }
  | { ok: false; response: Response };

async function findAdminUser(userId: string): Promise<AdminUser | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, role: true },
  });

  return user?.role === "ADMIN" ? user : null;
}

export async function requireAdminPage(returnPath?: string): Promise<AdminUser> {
  const session = await auth();
  if (!session) {
    const callbackUrl = getValidatedAdminReturnPath(returnPath, "/admin");
    redirect(`/sign-in?${new URLSearchParams({ callbackUrl })}`);
  }
  if (!session.user?.id) notFound();

  const user = await findAdminUser(session.user.id);
  if (!user) notFound();

  return user;
}

export async function requireAdminRequest(): Promise<AdminRequestResult> {
  const session = await auth();
  if (!session) {
    return {
      ok: false,
      response: Response.json({ error: "You must be signed in." }, { status: 401 }),
    };
  }
  if (!session.user?.id) {
    return {
      ok: false,
      response: Response.json({ error: "You are not authorized." }, { status: 403 }),
    };
  }

  const user = await findAdminUser(session.user.id);
  if (!user) {
    return {
      ok: false,
      response: Response.json({ error: "You are not authorized." }, { status: 403 }),
    };
  }

  return { ok: true, user };
}