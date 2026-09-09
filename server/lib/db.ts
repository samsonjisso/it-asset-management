import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

// A single pooled connection, shared across every Route Handler in this
// process (Next.js reuses the Node.js process between requests in both
// `next start` and most serverless-with-persistent-runtime deployments,
// so a module-level pool — not a per-request connection — is correct
// here, same as the original app's single `db` export).
declare global {
  // eslint-disable-next-line no-var
  var __gbbPool: mysql.Pool | undefined;
}

export const pool: mysql.Pool =
  global.__gbbPool ||
  mysql.createPool({
    host: process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "gbb_inventory",
    connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 10),
    dateStrings: true, // return DATE/DATETIME as strings, matching the original ISO-string columns
    decimalNumbers: true,
  });

if (process.env.NODE_ENV !== "production") {
  global.__gbbPool = pool;
}

/** Current UTC timestamp in MySQL DATETIME(3) format. */
export function nowSql(): string {
  return new Date().toISOString().slice(0, 23).replace("T", " ");
}

/**
 * Runs `fn` inside a transaction on a dedicated connection from the
 * pool, committing on success and rolling back on any thrown error.
 */
export async function withTransaction<T>(
  fn: (conn: mysql.PoolConnection) => Promise<T>,
): Promise<T> {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}
