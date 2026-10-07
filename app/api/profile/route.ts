import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const profileSelect = {
  firstName: true,
  lastName: true,
  name: true,
  email: true,
  phone: true,
  address: true,
} as const;

type ProfileUpdate = {
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  address?: string | null;
};

const fieldLimits = {
  firstName: 100,
  lastName: 100,
  phone: 50,
  address: 500,
} as const;
const profileFields = ["firstName", "lastName", "phone", "address"] as const;
const allowedProfileFields: readonly string[] = profileFields;

function parseProfileUpdate(value: unknown): ProfileUpdate | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const body = value as Record<string, unknown>;
  if (Object.keys(body).some((key) => !allowedProfileFields.includes(key))) return null;

  const update: ProfileUpdate = {};
  for (const field of profileFields) {
    if (!(field in body)) continue;
    const fieldValue = body[field];
    if (typeof fieldValue !== "string") return null;
    const trimmed = fieldValue.trim();
    if (trimmed.length > fieldLimits[field]) return null;
    update[field] = trimmed || null;
  }

  return Object.keys(update).length > 0 ? update : null;
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
  }

  try {
    const profile = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: profileSelect,
    });
    if (!profile) {
      return NextResponse.json({ error: "Profile not found." }, { status: 404 });
    }

    return NextResponse.json({ profile }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("Unable to load the user profile.", error);
    return NextResponse.json({ error: "Unable to load your profile." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const update = parseProfileUpdate(body);
  if (!update) {
    return NextResponse.json({ error: "Profile fields are invalid or missing." }, { status: 400 });
  }

  try {
    const profile = await prisma.$transaction(async (transaction) => {
      const current = await transaction.user.findUnique({
        where: { id: session.user.id },
        select: { firstName: true, lastName: true },
      });
      if (!current) return null;

      const firstName = update.firstName === undefined ? current.firstName : update.firstName;
      const lastName = update.lastName === undefined ? current.lastName : update.lastName;
      const data = {
        ...update,
        ...(("firstName" in update || "lastName" in update) && {
          name: [firstName, lastName].filter(Boolean).join(" ") || null,
        }),
      };

      return transaction.user.update({
        where: { id: session.user.id },
        data,
        select: profileSelect,
      });
    });

    if (!profile) {
      return NextResponse.json({ error: "Profile not found." }, { status: 404 });
    }
    return NextResponse.json({ profile });
  } catch (error) {
    console.error("Unable to save the user profile.", error);
    return NextResponse.json({ error: "Unable to save your profile." }, { status: 500 });
  }
}
