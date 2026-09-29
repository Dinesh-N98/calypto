import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const businessName = typeof body.businessName === "string" ? body.businessName.trim() : "";
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" ? body.email.toLowerCase().trim() : "";
    const message = typeof body.message === "string" ? body.message.trim() : "";

    if (!businessName || !name || !email || !message) {
      return NextResponse.json(
        { error: "Business name, contact name, email, and message are required." },
        { status: 400 },
      );
    }

    await prisma.lead.create({
      data: {
        type: "wholesale",
        name,
        email,
        company: businessName,
        message,
      },
    });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Unable to send your wholesale inquiry." }, { status: 500 });
  }
}
