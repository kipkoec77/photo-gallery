import bcrypt from "bcryptjs";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

import { connectToDatabase } from "../src/lib/mongodb";
import Admin from "../src/models/Admin";
import { loadScriptEnv } from "./load-env";

async function promptCredentials(): Promise<{ email: string; password: string }> {
  const rl = createInterface({ input, output });

  try {
    const email = (await rl.question("Admin email: ")).trim().toLowerCase();
    const password = (await rl.question("Admin password: ")).trim();

    if (!email || !password) {
      throw new Error("Email and password are required.");
    }

    return { email, password };
  } finally {
    rl.close();
  }
}

async function upsertAdmin(email: string, password: string): Promise<"created" | "updated"> {
  await connectToDatabase();

  const passwordHash = await bcrypt.hash(password, 10);
  const existingAdmin = await Admin.findOne().sort({ createdAt: 1 });

  if (existingAdmin) {
    existingAdmin.email = email;
    existingAdmin.passwordHash = passwordHash;
    await existingAdmin.save();
    return "updated";
  }

  await Admin.create({ email, passwordHash });
  return "created";
}

async function main() {
  try {
    loadScriptEnv();
    const { email, password } = await promptCredentials();
    const result = await upsertAdmin(email, password);
    output.write(`Admin ${result} successfully for ${email}.\n`);
    process.exit(0);
  } catch (error) {
    output.write(
      `Failed to create/update admin: ${error instanceof Error ? error.message : "Unknown error"}\n`
    );
    process.exit(1);
  }
}

void main();