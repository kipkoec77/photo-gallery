import mongoose from "mongoose";

import { connectToDatabase } from "../src/lib/mongodb";
import { loadScriptEnv } from "./load-env";

async function main() {
  try {
    loadScriptEnv();

    const connection = await connectToDatabase();
    const pingResult = await connection.connection.db?.admin().ping();

    if (!pingResult?.ok) {
      throw new Error("MongoDB ping failed.");
    }

    const host = connection.connection.host || mongoose.connection.host;
    const databaseName = connection.connection.name || mongoose.connection.name;

    console.log(`MongoDB connection OK: ${host}/${databaseName}`);
    await connection.connection.close();
    process.exit(0);
  } catch (error) {
    console.error(
      `MongoDB connection test failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
    process.exit(1);
  }
}

void main();