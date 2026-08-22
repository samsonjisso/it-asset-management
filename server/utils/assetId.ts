import type { Row } from "../types.js";

export function assetTypeCode(table: string, body: Row): string | null {
  if (table === "pc_registrations") return "COMP";
  if (table === "servers") return "SRV";
  if (table === "licenses") return "LIC";
  if (table === "devices") {
    const text = String(body.device_type || "DEV")
      .toUpperCase()
      .replace(/[^A-Z]/g, "");
    return text ? text.slice(0, 4).padEnd(3, "X") : "DEV";
  }
  if (table === "assets") {
    const text = String(body.asset_type || "AST")
      .toUpperCase()
      .replace(/[^A-Z]/g, "");
    return text ? text.slice(0, 4).padEnd(3, "X") : "AST";
  }
  return null;
}

export async function reserveAssetId(
  connection: any,
  table: string,
  body: Row,
): Promise<string | null> {
  const code = assetTypeCode(table, body);
  if (!code) return null;
  const [rows] = await connection.execute(
    "SELECT next_seq FROM asset_id_counters WHERE prefix = ? FOR UPDATE",
    [code],
  );
  let seq: number;
  if ((rows as any[]).length === 0) {
    seq = 1;
    await connection.execute(
      "INSERT INTO asset_id_counters (prefix, next_seq) VALUES (?, ?)",
      [code, 2],
    );
  } else {
    seq = Number((rows as any[])[0].next_seq);
    await connection.execute(
      "UPDATE asset_id_counters SET next_seq = ? WHERE prefix = ?",
      [seq + 1, code],
    );
  }
  return `GBB-${code}-${String(seq).padStart(3, "0")}`;
}
