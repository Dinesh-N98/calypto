import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const LEAD_CSV_HEADERS = [
  "shop_name",
  "country",
  "city",
  "state",
  "address",
  "email",
  "phone",
  "website",
  "send_email",
  "notes",
];

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const defaultCsvPath = path.resolve(
  scriptDirectory,
  "..",
  "private",
  "old-leads",
  "master_leads.csv",
);

export function parseCsv(input) {
  const records = [];
  let record = [];
  let field = "";
  let inQuotes = false;
  let afterQuote = false;

  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];

    if (inQuotes) {
      if (character === '"') {
        if (input[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          inQuotes = false;
          afterQuote = true;
        }
      } else {
        field += character;
      }
      continue;
    }

    if (afterQuote) {
      if (character === ",") {
        record.push(field);
        field = "";
        afterQuote = false;
      } else if (character === "\n" || character === "\r") {
        record.push(field);
        records.push(record);
        record = [];
        field = "";
        afterQuote = false;
        if (character === "\r" && input[index + 1] === "\n") index += 1;
      } else {
        throw new Error(`Unexpected character after a quoted CSV field at offset ${index + 1}.`);
      }
      continue;
    }

    if (character === '"') {
      if (field.length > 0) {
        throw new Error(`Unexpected quote in an unquoted CSV field at offset ${index + 1}.`);
      }
      inQuotes = true;
    } else if (character === ",") {
      record.push(field);
      field = "";
    } else if (character === "\n" || character === "\r") {
      record.push(field);
      records.push(record);
      record = [];
      field = "";
      if (character === "\r" && input[index + 1] === "\n") index += 1;
    } else {
      field += character;
    }
  }

  if (inQuotes) throw new Error("The CSV ends inside a quoted field.");
  if (field.length > 0 || record.length > 0 || afterQuote) {
    record.push(field);
    records.push(record);
  }

  return records.filter((row) => row.some((value) => value.trim() !== ""));
}

export function parseLeadCsv(input) {
  const [rawHeader, ...rows] = parseCsv(input);
  if (!rawHeader) throw new Error("The CSV is empty.");

  const header = rawHeader.map((value, index) =>
    index === 0 ? value.replace(/^\uFEFF/u, "").trim() : value.trim(),
  );
  const missingHeaders = LEAD_CSV_HEADERS.filter((name) => !header.includes(name));
  const unexpectedHeaders = header.filter((name) => !LEAD_CSV_HEADERS.includes(name));
  if (
    missingHeaders.length > 0 ||
    unexpectedHeaders.length > 0 ||
    new Set(header).size !== header.length
  ) {
    throw new Error(
      `CSV headers do not match the expected columns (missing: ${missingHeaders.length}, unexpected or repeated: ${unexpectedHeaders.length + header.length - new Set(header).size}).`,
    );
  }

  return rows.map((row, index) => {
    if (row.length !== header.length) {
      throw new Error(
        `CSV record ${index + 2} has ${row.length} columns; expected ${header.length}.`,
      );
    }
    return Object.fromEntries(header.map((name, column) => [name, row[column]]));
  });
}

function clean(value) {
  return typeof value === "string" ? value.trim() : "";
}

export function mapLeadRow(row) {
  const shopName = clean(row.shop_name);
  const email = clean(row.email).toLowerCase();
  const sendEmail = clean(row.send_email) || "Not provided";
  const notes = clean(row.notes) || "None";

  return {
    type: "wholesale",
    name: shopName || "Unknown Shop",
    email: email || null,
    phone: clean(row.phone) || null,
    company: shopName || null,
    country: clean(row.country) || null,
    city: clean(row.city) || null,
    state: clean(row.state) || null,
    address: clean(row.address) || null,
    website: clean(row.website) || null,
    message: `Imported Wholesale Lead | Send Email: ${sendEmail} | Notes: ${notes}`,
  };
}

function normalize(value) {
  return value.trim().replace(/\s+/gu, " ").toLocaleLowerCase("en");
}

export function duplicateKey(lead) {
  if (lead.email) return `email:${normalize(lead.email)}`;
  if (lead.company && lead.country) {
    return `name-country:${normalize(lead.name)}\u0000${normalize(lead.country)}`;
  }
  return null;
}

export function existingDuplicateKeys(leads) {
  const keys = new Set();
  for (const lead of leads) {
    if (lead.email) keys.add(`email:${normalize(lead.email)}`);
    if (lead.country) {
      keys.add(`name-country:${normalize(lead.name)}\u0000${normalize(lead.country)}`);
    }
  }
  return keys;
}

function duplicateWhere(lead) {
  if (lead.email) {
    return { email: { equals: lead.email, mode: "insensitive" } };
  }
  return {
    name: { equals: lead.name, mode: "insensitive" },
    country: { equals: lead.country, mode: "insensitive" },
  };
}

async function findExistingDuplicateKeys(prisma, leads) {
  const where = leads.filter((lead) => duplicateKey(lead)).map(duplicateWhere);
  if (where.length === 0) return new Set();

  const existing = await prisma.lead.findMany({
    where: { OR: where },
    select: { email: true, name: true, country: true },
  });
  return existingDuplicateKeys(existing);
}

export function planImport(leads, existingKeys = new Set()) {
  const seenKeys = new Set();
  const toInsert = [];
  let duplicateInFile = 0;
  let duplicateInDatabase = 0;
  let missingDuplicateKey = 0;

  for (const lead of leads) {
    const key = duplicateKey(lead);
    if (!key) missingDuplicateKey += 1;
    if (key && seenKeys.has(key)) {
      duplicateInFile += 1;
      continue;
    }
    if (key) seenKeys.add(key);
    if (key && existingKeys.has(key)) {
      duplicateInDatabase += 1;
      continue;
    }
    toInsert.push(lead);
  }

  return { toInsert, duplicateInFile, duplicateInDatabase, missingDuplicateKey };
}

function printSummary(total, plan, dryRun) {
  console.log(`CSV records parsed: ${total}`);
  console.log(`Duplicate records in CSV skipped: ${plan.duplicateInFile}`);
  console.log(`Existing database duplicates skipped: ${plan.duplicateInDatabase}`);
  console.log(`Records without enough data for duplicate matching: ${plan.missingDuplicateKey}`);
  console.log(`Records ${dryRun ? "that would be imported" : "imported"}: ${plan.toInsert.length}`);
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const unknownArgs = args.filter((argument) => argument !== "--dry-run");
  if (unknownArgs.length > 0) {
    throw new Error(`Unknown argument: ${unknownArgs[0]}`);
  }

  const csv = await readFile(defaultCsvPath, "utf8");
  const leads = parseLeadCsv(csv).map(mapLeadRow);
  if (leads.length === 0) {
    console.log("The CSV contains no lead records.");
    return;
  }

  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();
  try {
    if (dryRun) {
      const existingKeys = await findExistingDuplicateKeys(prisma, leads);
      printSummary(leads.length, planImport(leads, existingKeys), true);
      return;
    }

    const result = await prisma.$transaction(async (transaction) => {
      const existingKeys = await findExistingDuplicateKeys(transaction, leads);
      const plan = planImport(leads, existingKeys);
      if (plan.toInsert.length > 0) {
        await transaction.lead.createMany({ data: plan.toInsert });
      }
      return plan;
    });
    printSummary(leads.length, result, false);
  } finally {
    await prisma.$disconnect();
  }
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : "";
if (import.meta.url === invokedPath) {
  main().catch((error) => {
    console.error(`Lead import failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  });
}
