import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" ? body.email.toLowerCase().trim() : "";
    const message = typeof body.message === "string" ? body.message.trim() : "";

    if (!name || !email || !message) {
      return NextResponse.json(
        { error: "Name, email, and message are required." },
        { status: 400 },
      );
    }

    await prisma.lead.create({
      data: { type: "contact", name, email, message },
    });

    // Synthetic contact flow for now; add email delivery here when a provider is configured.
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Unable to send your message." }, { status: 500 });
  }
}