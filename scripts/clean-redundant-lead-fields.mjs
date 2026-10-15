import path from "node:path";
import { pathToFileURL } from "node:url";

function normalize(value) {
  return typeof value === "string" ? value.trim().toLocaleLowerCase("en") : "";
}

export function planRedundantLeadCleanup(leads) {
  const updates = [];

  for (const lead of leads) {
    const clearName =
      normalize(lead.name) !== "" && normalize(lead.name) === normalize(lead.company);
    const clearCity =
      normalize(lead.city) !== "" && normalize(lead.city) === normalize(lead.country);

    if (clearName || clearCity) {
      updates.push({
        id: lead.id,
        ...(clearName ? { name: "" } : {}),
        ...(clearCity ? { city: null } : {}),
      });
    }
  }

  return {
    scanned: leads.length,
    namesCleared: updates.filter((lead) => "name" in lead).length,
    citiesCleared: updates.filter((lead) => "city" in lead).length,
    updates,
  };
}

async function main() {
  const args = process.argv.slice(2);
  const execute = args.includes("--execute");
  const unknownArgs = args.filter((argument) => !["--execute", "--dry-run"].includes(argument));
  if (unknownArgs.length > 0) {
    throw new Error(`Unknown argument: ${unknownArgs[0]}`);
  }
  if (execute && args.includes("--dry-run")) {
    throw new Error("Choose either --dry-run or --execute, not both.");
  }

  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();
  try {
    const leads = await prisma.lead.findMany({
      select: { id: true, name: true, company: true, city: true, country: true },
    });
    const plan = planRedundantLeadCleanup(leads);

    if (execute && plan.updates.length > 0) {
      await prisma.$transaction(
        plan.updates.map((update) =>
          prisma.lead.update({
            where: { id: update.id },
            data: {
              ...("name" in update ? { name: update.name } : {}),
              ...("city" in update ? { city: update.city } : {}),
            },
          }),
        ),
      );
    }

    console.log(`Lead records scanned: ${plan.scanned}`);
    console.log(`Names ${execute ? "cleared" : "to clear"}: ${plan.namesCleared}`);
    console.log(`Cities ${execute ? "cleared" : "to clear"}: ${plan.citiesCleared}`);
    console.log(
      execute
        ? `Lead records updated: ${plan.updates.length}`
        : `Lead records that would be updated: ${plan.updates.length}`,
    );
    if (!execute) console.log("Dry run only; no records changed. Re-run with --execute to apply.");
  } finally {
    await prisma.$disconnect();
  }
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : "";
if (import.meta.url === invokedPath) {
  main().catch((error) => {
    console.error(
      `Redundant lead field cleanup failed: ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exitCode = 1;
  });
}
