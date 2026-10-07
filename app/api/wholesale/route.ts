import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseWholesalePhone } from "@/lib/wholesalePhone";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Invalid wholesale inquiry." }, { status: 400 });
    }
    const businessName = typeof body.businessName === "string" ? body.businessName.trim() : "";
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" ? body.email.toLowerCase().trim() : "";
    const message = typeof body.message === "string" ? body.message.trim() : "";
    const parsedPhone = parseWholesalePhone(body.phone);

    if (!businessName || !name || !email || !message) {
      return NextResponse.json(
        { error: "Business name, contact name, email, and message are required." },
        { status: 400 },
      );
    }
    if (!parsedPhone.valid) {
      return NextResponse.json(
        { error: "Enter a valid phone number containing 7 to 15 digits." },
        { status: 400 },
      );
    }

    await prisma.lead.create({
      data: {
        type: "wholesale",
        name,
        email,
        phone: parsedPhone.phone,
        company: businessName,
        message,
      },
    });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Unable to send your wholesale inquiry." }, { status: 500 });
  }
}
