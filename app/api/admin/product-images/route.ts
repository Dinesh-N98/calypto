import { NextResponse } from "next/server";
import { requireAdminRequest } from "@/lib/admin";
import {
  InvalidProductImageError,
  MAX_PRODUCT_IMAGE_SIZE,
  ProductImageStorageConfigurationError,
  uploadProductImage,
} from "@/lib/product-image-storage";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const authorization = await requireAdminRequest();
  if (!authorization.ok) return authorization.response;

  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: "Cross-origin uploads are not allowed." }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Choose an image file to upload." }, { status: 400 });
  }
  if (file.size > MAX_PRODUCT_IMAGE_SIZE) {
    return NextResponse.json({ error: "Images must be 10 MB or smaller." }, { status: 413 });
  }

  try {
    const imageUrl = await uploadProductImage(file);
    return NextResponse.json({ imageUrl }, { status: 201 });
  } catch (error) {
    if (error instanceof ProductImageStorageConfigurationError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    if (error instanceof InvalidProductImageError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}
