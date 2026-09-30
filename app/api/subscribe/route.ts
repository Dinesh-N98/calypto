import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = typeof body.email === "string" ? body.email.toLowerCase().trim() : "";

    if (!email || email.length > 254 || !EMAIL_PATTERN.test(email)) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }

    const existing = await prisma.lead.findFirst({
      where: { type: "newsletter", email },
      select: { id: true },
    });

    if (!existing) {
      await prisma.lead.create({
        data: {
          type: "newsletter",
          name: "Newsletter subscriber",
          email,
          message: "Popup signup – 15% off first order",
        },
      });
    }

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Unable to subscribe right now." }, { status: 500 });
  }
}
