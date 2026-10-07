import bcrypt from "bcrypt";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "You must be signed in." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return Response.json({ error: "Password fields are invalid." }, { status: 400 });
  }
  const values = body as Record<string, unknown>;
  if (Object.keys(values).some((key) => key !== "currentPassword" && key !== "newPassword")) {
    return Response.json({ error: "Password fields are invalid." }, { status: 400 });
  }
  const currentPassword = values.currentPassword;
  const newPassword = values.newPassword;
  if (
    typeof currentPassword !== "string" ||
    !currentPassword ||
    typeof newPassword !== "string" ||
    newPassword.length < 8 ||
    newPassword.length > 256
  ) {
    return Response.json(
      { error: "Enter your current password and a new password of at least 8 characters." },
      { status: 400 },
    );
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { hashedPassword: true },
    });
    if (!user?.hashedPassword) {
      return Response.json(
        { error: "This account does not have a password. Use your identity provider to sign in." },
        { status: 400 },
      );
    }
    if (!(await bcrypt.compare(currentPassword, user.hashedPassword))) {
      return Response.json({ error: "Current password is incorrect." }, { status: 400 });
    }
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: session.user.id },
      data: { hashedPassword },
    });
    return Response.json({ ok: true });
  } catch (error) {
    console.error("Unable to update customer password.", error);
    return Response.json({ error: "Unable to update your password." }, { status: 500 });
  }
}
