import mysql, { type Pool } from "mysql2/promise";
import fs from "node:fs";
import { runColumnMigrations } from "./dbMigrations.js";
import { createSyncTriggers } from "./dbTriggers.js";

/**
 * Creates the database if needed, runs schema.sql, then applies the
 * backward-compatible column/foreign-key/index migrations and the
 * ip_addresses sync triggers. Split out of the original db.ts so each
 * piece (schema bootstrap, column migrations, triggers) is independently
 * readable; behavior and statement order are unchanged.
 */
export async function initializeDatabase(
  db: Pool,
  dbConfig: { host: string; port: number; user: string; password: string },
  dbName: string,
  schemaPath: string,
) {
  try {
    const bootstrap = await mysql.createConnection(dbConfig);
    try {
      const escapedDbName = dbName.replace(/`/g, "``");
      await bootstrap.execute(
        `CREATE DATABASE IF NOT EXISTS \`${escapedDbName}\``,
      );
    } finally {
      await bootstrap.end();
    }

    const connection = await db.getConnection();
    try {
      const schema = fs.readFileSync(schemaPath, "utf-8");

      // Split schema by semicolons and execute each statement
      const statements = schema
        .split(";")
        .map((stmt) => stmt.trim())
        .filter((stmt) => stmt.length > 0);

      for (const statement of statements) {
        await connection.execute(statement);
      }

      // Backward-compatible migrations for databases created by the older
      // Next.js/MariaDB version. These only add missing columns/indexes and
      // never drop existing data.
      await runColumnMigrations(connection);
      await createSyncTriggers(connection);

      console.log(
        "Database schema initialized and backward-compatible migrations applied",
      );
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Failed to initialize database:", error);
    throw error;
  }
}
