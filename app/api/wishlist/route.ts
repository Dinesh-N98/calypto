import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

function parseProductId(value: unknown): string | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  if (Object.keys(input).some((key) => key !== "productId")) return null;
  const productId = input.productId;
  return typeof productId === "string" && productId.length > 0 && productId.length <= 100
    ? productId
    : null;
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
  }

  try {
    const items = await prisma.wishlistItem.findMany({
      where: { userId: session.user.id },
      select: { productId: true },
    });
    return NextResponse.json(
      { productIds: items.map((item) => item.productId) },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    console.error("Unable to load the customer wishlist.", error);
    return NextResponse.json({ error: "Unable to load your wishlist." }, { status: 500 });
  }
}

async function getProductId(request: Request) {
  try {
    return parseProductId(await request.json());
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
  }
  const productId = await getProductId(request);
  if (!productId) {
    return NextResponse.json({ error: "A valid product is required." }, { status: 400 });
  }

  try {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true },
    });
    if (!product) return NextResponse.json({ error: "Product not found." }, { status: 404 });
    await prisma.wishlistItem.upsert({
      where: { userId_productId: { userId: session.user.id, productId } },
      create: { userId: session.user.id, productId },
      update: {},
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Unable to save a product to the customer wishlist.", error);
    return NextResponse.json({ error: "Unable to update your wishlist." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
  }
  const productId = await getProductId(request);
  if (!productId) {
    return NextResponse.json({ error: "A valid product is required." }, { status: 400 });
  }

  try {
    await prisma.wishlistItem.deleteMany({
      where: { userId: session.user.id, productId },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Unable to remove a product from the customer wishlist.", error);
    return NextResponse.json({ error: "Unable to update your wishlist." }, { status: 500 });
  }
}
