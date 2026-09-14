import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const products = [
  ["green-pumpkin-worm", "Green Pumpkin Worm", "Real Worm Bait", 699],
  ["salted-craw-worm", "Salted Craw Worm", "Real Worm Bait", 749],
  ["olive-flake-tube", "Olive Flake Tube", "Tube Bait", 799],
  ["midnight-tube", "Midnight Tube", "Tube Bait", 799],
  ["shad-runner", "Shad Runner", "Swimbait", 899],
  ["silver-minnow", "Silver Minnow", "Swimbait", 899],
].map(([slug, name, category, priceCents]) => ({
  slug,
  name,
  category,
  priceCents,
  description:
    "A tuned soft bait with natural movement, durable plastic, and a profile built to trigger decisive strikes.",
  imageUrl: "/bait-detail.jpeg",
}));
await prisma.product.deleteMany();
await prisma.product.createMany({ data: products });
await prisma.$disconnect();
