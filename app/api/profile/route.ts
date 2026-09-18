import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const address = typeof body.address === "string" ? body.address.trim() : "";
    const phone = typeof body.phone === "string" ? body.phone.trim() : "";

    await prisma.user.update({
      where: { id: session.user.id },
      data: { address: address || null, phone: phone || null },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Unable to save your profile." }, { status: 500 });
  }
}