import { GetObjectCommand, S3ServiceException } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";
import {
  getProductImageStorageClient,
  isProductImageKey,
  PRODUCT_IMAGE_BUCKET,
} from "@/lib/product-image-storage";

export const runtime = "nodejs";

const CONTENT_TYPES: Record<string, string> = {
  gif: "image/gif",
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ key: string[] }> },
) {
  const { key: keyParts } = await params;
  const key = keyParts.join("/");
  if (!isProductImageKey(key)) {
    return new Response("Not found", { status: 404 });
  }

  try {
    const object = await getProductImageStorageClient().send(
      new GetObjectCommand({ Bucket: PRODUCT_IMAGE_BUCKET, Key: key }),
    );
    if (!object.Body) throw new Error(`Product image object has no body: ${key}`);

    const extension = key.slice(key.lastIndexOf(".") + 1);
    return new Response(object.Body.transformToWebStream(), {
      headers: {
        "Cache-Control": "public, max-age=31536000, immutable",
        "Content-Type": object.ContentType ?? CONTENT_TYPES[extension],
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    if (error instanceof S3ServiceException && error.name === "NoSuchKey") {
      return NextResponse.json({ error: "Image not found." }, { status: 404 });
    }
    throw error;
  }
}
