import path from "node:path";
import { pathToFileURL } from "node:url";

const IMPORTED_MESSAGE_PREFIX = "Imported Wholesale Lead";

export function extractImportedNotes(message) {
  if (!message.startsWith(IMPORTED_MESSAGE_PREFIX)) return null;
  const match = message.match(/\|\s*Notes:\s*([\s\S]*)$/u);
  if (!match) return null;

  const notes = match[1].trim();
  return notes.toLowerCase() === "none" ? null : notes || null;
}

export function planLeadCleanup(leads) {
  const updates = [];
  let malformedMessages = 0;

  for (const lead of leads) {
    if (lead.type !== "wholesale" || !lead.message.startsWith(IMPORTED_MESSAGE_PREFIX)) continue;

    const markerExists = /\|\s*Notes:/u.test(lead.message);
    if (!markerExists) malformedMessages += 1;
    updates.push({
      id: lead.id,
      notes: markerExists ? extractImportedNotes(lead.message) : lead.notes,
    });
  }

  return { updates, malformedMessages };
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
      select: { id: true, type: true, message: true, notes: true },
    });
    const plan = planLeadCleanup(leads);

    if (execute && plan.updates.length > 0) {
      await prisma.$transaction(
        plan.updates.map((update) =>
          prisma.lead.update({
            where: { id: update.id },
            data: { ...(update.notes !== undefined ? { notes: update.notes } : {}), message: "" },
          }),
        ),
      );
    }

    console.log(`Lead records scanned: ${leads.length}`);
    console.log(
      `Imported wholesale leads ${execute ? "updated" : "to update"}: ${plan.updates.length}`,
    );
    console.log(`Notes fields populated: ${plan.updates.filter((lead) => lead.notes).length}`);
    console.log(`Imported messages missing a Notes marker: ${plan.malformedMessages}`);
    console.log(
      execute
        ? "Cleanup completed."
        : "Dry run only; no records changed. Re-run with --execute to apply these updates.",
    );
  } finally {
    await prisma.$disconnect();
  }
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : "";
if (import.meta.url === invokedPath) {
  main().catch((error) => {
    console.error(`Lead cleanup failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  });
}
