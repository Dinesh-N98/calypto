import { readFileSync } from "node:fs";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const confirmationWord = "CHANGE";
let promptInterface;

class SafeAbort extends Error {}

function readDatabaseUrlFromFile(fileName) {
  let content;
  try {
    content = readFileSync(fileName, "utf8");
  } catch {
    return undefined;
  }

  for (const line of content.split(/\r?\n/)) {
    const match = line.match(/^\s*(?:export\s+)?DATABASE_URL\s*=\s*(.*?)\s*$/);
    if (!match) continue;

    let value = match[1];
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    } else {
      value = value.replace(/\s+#.*$/, "").trim();
    }
    return value || undefined;
  }

  return undefined;
}

function loadDatabaseUrl() {
  const inheritedValue = process.env.DATABASE_URL?.trim();
  const databaseUrl =
    inheritedValue ||
    readDatabaseUrlFromFile(".env.local") ||
    readDatabaseUrlFromFile(".env");
  if (!databaseUrl) throw new SafeAbort("DATABASE_URL is missing.");

  process.env.DATABASE_URL = databaseUrl;
  return databaseUrl;
}

function getTarget(databaseUrl) {
  try {
    const url = new URL(databaseUrl);
    const endpoint = url.hostname.toLowerCase().split(".")[0];
    const database = decodeURIComponent(url.pathname.split("/")[1] ?? "");
    if (!/^ep-[a-z0-9-]+$/.test(endpoint) || !database) throw new Error();
    return { endpoint, database };
  } catch {
    throw new SafeAbort("DATABASE_URL does not identify a valid database target.");
  }
}

async function ask(question) {
  promptInterface ??= createInterface({ input: stdin, output: stdout });
  try {
    return await promptInterface.question(question);
  } catch {
    return "";
  }
}

async function main() {
  const [mode, rawEmail, ...extraArguments] = process.argv.slice(2);
  if (!["promote", "demote"].includes(mode) || extraArguments.length > 0) {
    console.error("Usage: admin:promote|admin:demote -- EMAIL_ADDRESS");
    return 1;
  }

  let client;
  try {
    const databaseUrl = loadDatabaseUrl();
    const target = getTarget(databaseUrl);
    console.log(`Target database: endpoint ${target.endpoint}, database ${target.database}`);

    const targetConfirmation = await ask(`Type ${target.endpoint} to confirm this target: `);
    if (targetConfirmation.trim() !== target.endpoint) {
      console.log("Target confirmation did not match. Aborted without changes.");
      return 1;
    }

    const email = typeof rawEmail === "string" ? rawEmail.toLowerCase().trim() : "";
    if (!email || email.length > 254 || !emailPattern.test(email)) {
      console.log("A valid email address argument is required. No changes made.");
      return 1;
    }

    const { PrismaClient } = await import("@prisma/client");
    client = new PrismaClient();
    const user = await client.user.findUnique({
      where: { email },
      select: { id: true, email: true, role: true },
    });

    if (!user) {
      console.log("No account exists for that email. No changes made.");
      return 1;
    }

    const newRole = mode === "promote" ? "ADMIN" : "CUSTOMER";
    if (user.role === newRole) {
      console.log(`Account already has role ${newRole}. No changes made.`);
      return 1;
    }

    if (newRole === "CUSTOMER") {
      const adminCount = await client.user.count({ where: { role: "ADMIN" } });
      if (adminCount <= 1) {
        console.log("Cannot demote the only remaining admin. No changes made.");
        return 1;
      }
    }

    console.log(`Email: ${user.email}`);
    console.log(`Current role: ${user.role}`);
    console.log(`New role: ${newRole}`);
    const changeConfirmation = await ask(`Type ${confirmationWord} exactly to apply this change: `);
    if (changeConfirmation !== confirmationWord) {
      console.log("Change confirmation did not match. Aborted without changes.");
      return 1;
    }

    await client.$transaction(
      async (transaction) => {
        const currentUser = await transaction.user.findUnique({
          where: { id: user.id },
          select: { id: true, role: true },
        });
        if (!currentUser || currentUser.role !== user.role) {
          throw new SafeAbort("The account role changed before confirmation. No changes made.");
        }
        if (newRole === "CUSTOMER") {
          const adminCount = await transaction.user.count({ where: { role: "ADMIN" } });
          if (adminCount <= 1) {
            throw new SafeAbort("Cannot demote the only remaining admin. No changes made.");
          }
        }
        await transaction.user.update({
          where: { id: user.id },
          data: { role: newRole },
        });
      },
      { isolationLevel: "Serializable" },
    );

    const updatedUser = await client.user.findUnique({
      where: { id: user.id },
      select: { id: true, email: true, role: true },
    });
    if (!updatedUser) throw new SafeAbort("The account could not be re-read after the update.");

    console.log(`Role after update: ${updatedUser.role}`);
    return 0;
  } catch (error) {
    if (error instanceof SafeAbort) {
      console.log(error.message);
    } else {
      console.error("Operation failed. No error details were printed.");
    }
    return 1;
  } finally {
    promptInterface?.close();
    if (client) {
      try {
        await client.$disconnect();
      } catch {
        console.error("Database client disconnect failed.");
      }
    }
  }
}

process.exitCode = await main();
