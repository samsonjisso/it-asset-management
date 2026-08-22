import { config } from "dotenv";
import mysql from "mysql2/promise";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { initializeDatabase } from "./dbSchema.js";
import { seedConfigurationDefaults, seedDefaultAdmin } from "./dbSeed.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Resolve path directly to it-asset-management/server/.env
// This file now lives one level deeper than the original db.ts
// (server/utils/db.ts instead of server/db.ts), so we go up one more
// directory to keep pointing at server/.env.
const envPath = path.resolve(__dirname, "../.env");

config({ path: envPath });

// Verification log
console.log("DB Host loaded:", process.env.DB_HOST);

const dbName = process.env.DB_NAME || "gbb_inventory";
const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "3306", 10),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
};

// Create the database before opening a pool that selects it by default.
export const db = mysql.createPool({
  ...dbConfig,
  database: dbName,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

export function nowIso(): string {
  return new Date().toISOString();
}

// schema.sql lives at the server root, one directory above this file.
const schemaPath = path.resolve(__dirname, "../schema.sql");

// Initialize on import - same side-effecting startup sequence as the
// original db.ts: create/migrate the schema, then seed lookup tables
// and the default admin account, in order.
await initializeDatabase(db, dbConfig, dbName, schemaPath);
await seedConfigurationDefaults(db, nowIso);
await seedDefaultAdmin(db, nowIso);
