import { pool } from "@/server/lib/db";
import { jsonError, jsonOk } from "@/server/lib/http";

export async function GET() {
  try {
    await pool.query("SELECT 1");
    return jsonOk({ ok: true, database: "connected" });
  } catch (error) {
    console.error("Database health check failed:", error);
    return jsonError(503, "Database unavailable");
  }
}
