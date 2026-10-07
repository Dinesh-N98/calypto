import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { randomUUID } from "node:crypto";

export const PRODUCT_IMAGE_BUCKET = "product-images";
export const MAX_PRODUCT_IMAGE_SIZE = 10 * 1024 * 1024;

const IMAGE_FORMATS = [
  { extension: "jpg", contentType: "image/jpeg" },
  { extension: "png", contentType: "image/png" },
  { extension: "webp", contentType: "image/webp" },
  { extension: "gif", contentType: "image/gif" },
] as const;

let client: S3Client | undefined;

export class ProductImageStorageConfigurationError extends Error {}
export class InvalidProductImageError extends Error {}

export function getProductImageStorageClient(): S3Client {
  const endpoint = process.env.AWS_ENDPOINT_URL_S3;
  const region = process.env.AWS_REGION;
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  if (!endpoint || !region || !accessKeyId || !secretAccessKey) {
    throw new ProductImageStorageConfigurationError(
      "Product image storage is not configured. Provision the product-images bucket and set the Neon AWS_* environment variables.",
    );
  }

  if (!client) {
    client = new S3Client({
      endpoint,
      region,
      credentials: { accessKeyId, secretAccessKey },
      forcePathStyle: true,
    });
  }
  return client;
}

export function detectProductImageFormat(
  bytes: Uint8Array,
): (typeof IMAGE_FORMATS)[number] | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return IMAGE_FORMATS[0];
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return IMAGE_FORMATS[1];
  }
  if (
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  ) {
    return IMAGE_FORMATS[2];
  }
  if (
    bytes.length >= 6 &&
    ["GIF87a", "GIF89a"].includes(String.fromCharCode(...bytes.slice(0, 6)))
  ) {
    return IMAGE_FORMATS[3];
  }
  return null;
}

export async function uploadProductImage(file: File): Promise<string> {
  if (file.size === 0 || file.size > MAX_PRODUCT_IMAGE_SIZE) {
    throw new InvalidProductImageError(
      "Product images must be larger than 0 bytes and no larger than 10 MB.",
    );
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const format = detectProductImageFormat(bytes);
  if (!format) {
    throw new InvalidProductImageError("Choose a valid JPG, PNG, WEBP, or GIF image.");
  }

  const key = `products/${randomUUID()}.${format.extension}`;
  await getProductImageStorageClient().send(
    new PutObjectCommand({
      Bucket: PRODUCT_IMAGE_BUCKET,
      Key: key,
      Body: bytes,
      ContentType: format.contentType,
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );

  return `/api/product-images/${key}`;
}

export function isProductImageKey(key: string): boolean {
  return /^products\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(?:jpg|png|webp|gif)$/.test(
    key,
  );
}
