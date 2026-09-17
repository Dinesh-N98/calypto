import { PrismaClient } from "@prisma/client";

import { readdir } from "node:fs/promises";
import path from "node:path";

const prisma = new PrismaClient();
const productsDirectory = path.join(process.cwd(), "public", "products");
const description =
  "A tuned soft bait with natural movement, durable plastic, and a profile built to trigger decisive strikes.";
const categories = [
  { slug: "worm", displayName: "Worm Bait", priceCents: 210000 },
  { slug: "swimbait", displayName: "Swimbait", priceCents: 270000 },
  { slug: "curly-tail-grub", displayName: "Curly-Tail Grub", priceCents: 195000 },
  { slug: "jig", displayName: "Jig", priceCents: 180000 },
];

const products = [];
for (const category of categories) {
  const files = (await readdir(path.join(productsDirectory, category.slug)))
    .filter((file) => file.toLowerCase().endsWith(".jpg"))
    .sort((first, second) => first.localeCompare(second, undefined, { numeric: true }));

  for (const [index, file] of files.entries()) {
    const number = String(index + 1).padStart(2, "0");
    products.push({
      slug: `${category.slug}-${number}`,
      name: `${category.displayName} Color ${number}`,
      category: category.displayName,
      // Placeholder pricing requires client input before launch.
      priceCents: category.priceCents,
      description,
      imageUrl: `/products/${category.slug}/${file}`,
    });
  }
}

await prisma.product.deleteMany();
await prisma.product.createMany({ data: products });
await prisma.$disconnect();
