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
  addresses: true,
} as const;

type ProfileUpdate = {
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  address?: string | null;
};

type AddressInput = {
  action: "create" | "update" | "delete" | "default";
  id?: string;
  line1?: string;
  line2?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  isDefault?: boolean;
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

function parseAddressAction(value: unknown): AddressInput | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  const allowedFields = ["action", "id", "line1", "line2", "city", "postalCode", "country", "isDefault"];
  if (Object.keys(input).some((key) => !allowedFields.includes(key))) return null;
  const action = input.action;
  if (action !== "create" && action !== "update" && action !== "delete" && action !== "default") {
    return null;
  }

  const id = input.id;
  if (action !== "create" && (typeof id !== "string" || !id)) return null;
  if (action === "delete" || action === "default") {
    return { action, ...(typeof id === "string" && { id }) };
  }

  const limits = { line1: 200, line2: 200, city: 100, postalCode: 30, country: 100 };
  const fields = ["line1", "line2", "city", "postalCode", "country"] as const;
  const result: AddressInput = { action, ...(typeof id === "string" && { id }) };
  for (const field of fields) {
    const fieldValue = input[field];
    if (fieldValue === undefined && action === "update") continue;
    if (typeof fieldValue !== "string") return null;
    const trimmed = fieldValue.trim();
    if (trimmed.length > limits[field] || (field !== "line2" && !trimmed)) return null;
    result[field] = trimmed;
  }
  if (input.isDefault !== undefined) {
    if (typeof input.isDefault !== "boolean") return null;
    result.isDefault = input.isDefault;
  }
  return result;
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

  if (body && typeof body === "object" && !Array.isArray(body) && "addresses" in body) {
    const action = parseAddressAction((body as Record<string, unknown>).addresses);
    if (!action) {
      return NextResponse.json({ error: "Address fields are invalid or missing." }, { status: 400 });
    }

    try {
      const addresses = await prisma.$transaction(async (transaction) => {
        if (action.action === "create") {
          const existingCount = await transaction.address.count({
            where: { userId: session.user.id },
          });
          const created = await transaction.address.create({
            data: {
              userId: session.user.id,
              line1: action.line1!,
              line2: action.line2 || null,
              city: action.city!,
              postalCode: action.postalCode!,
              country: action.country!,
              isDefault: existingCount === 0 || action.isDefault === true,
            },
          });
          if (created.isDefault) {
            await transaction.address.updateMany({
              where: { userId: session.user.id, id: { not: created.id } },
              data: { isDefault: false },
            });
          }
        } else {
          const current = await transaction.address.findFirst({
            where: { id: action.id, userId: session.user.id },
          });
          if (!current) return null;

          if (action.action === "delete") {
            await transaction.address.delete({ where: { id: current.id } });
            if (current.isDefault) {
              const nextDefault = await transaction.address.findFirst({
                where: { userId: session.user.id },
                orderBy: { createdAt: "asc" },
              });
              if (nextDefault) {
                await transaction.address.update({
                  where: { id: nextDefault.id },
                  data: { isDefault: true },
                });
              }
            }
          } else if (action.action === "default") {
            await transaction.address.updateMany({
              where: { userId: session.user.id },
              data: { isDefault: false },
            });
            await transaction.address.update({
              where: { id: current.id },
              data: { isDefault: true },
            });
          } else {
            const updated = await transaction.address.update({
              where: { id: current.id },
              data: {
                ...(action.line1 !== undefined && { line1: action.line1 }),
                ...(action.line2 !== undefined && { line2: action.line2 || null }),
                ...(action.city !== undefined && { city: action.city }),
                ...(action.postalCode !== undefined && { postalCode: action.postalCode }),
                ...(action.country !== undefined && { country: action.country }),
                ...(action.isDefault !== undefined && { isDefault: action.isDefault }),
              },
            });
            if (updated.isDefault) {
              await transaction.address.updateMany({
                where: { userId: session.user.id, id: { not: updated.id } },
                data: { isDefault: false },
              });
            } else if (current.isDefault && action.isDefault === false) {
              const nextDefault = await transaction.address.findFirst({
                where: { userId: session.user.id, id: { not: updated.id } },
                orderBy: { createdAt: "asc" },
              });
              if (nextDefault) {
                await transaction.address.update({
                  where: { id: nextDefault.id },
                  data: { isDefault: true },
                });
              }
            }
          }
        }

        return transaction.address.findMany({
          where: { userId: session.user.id },
          orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
        });
      });

      if (!addresses) {
        return NextResponse.json({ error: "Address not found." }, { status: 404 });
      }
      return NextResponse.json({ addresses });
    } catch (error) {
      console.error("Unable to update customer addresses.", error);
      return NextResponse.json({ error: "Unable to update your addresses." }, { status: 500 });
    }
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
