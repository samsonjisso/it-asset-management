import type { NextFunction, Request, Response } from "express";
import { assertSafeText, containsUnsafeScript, isValidIpv4 } from "./common.js";

/** Pure validation core - see pcValidation.ts for why this is split out. */
export function validateAssetBody(body: Record<string, unknown>): void {
  const departmentId =
    typeof body.department_id === "string" ? body.department_id.trim() : "";
  if (!departmentId) {
    throw new Error("Department is required for all asset entries.");
  }

  const assetName =
    typeof body.asset_name === "string" ? body.asset_name.trim() : "";
  if (assetName && containsUnsafeScript(assetName)) {
    throw new Error(
      "Asset name contains invalid or unsafe script characters.",
    );
  }

  const assetType =
    typeof body.asset_type === "string" ? body.asset_type.trim() : "";
  if (assetType && containsUnsafeScript(assetType)) {
    throw new Error(
      "Asset type contains invalid or unsafe script characters.",
    );
  }

  const ip =
    typeof body.ip_address === "string" ? body.ip_address.trim() : "";
  if (ip && !isValidIpv4(ip)) {
    throw new Error("IP address must be a valid IPv4 address.");
  }

  const hostname =
    typeof body.hostname === "string" ? body.hostname.trim() : "";
  if (hostname && containsUnsafeScript(hostname)) {
    throw new Error("Hostname contains invalid or unsafe script characters.");
  }

  for (const key of [
    "owner",
    "location",
    "model",
    "serial_number",
    "manufacturer",
    "supplier",
    "operating_system",
    "notes",
  ]) {
    const value = body[key];
    if (typeof value === "string") assertSafeText(value, key);
  }
}

export function validateAsset(req: Request, res: Response, next: NextFunction) {
  try {
    if (["GET", "HEAD", "OPTIONS", "DELETE"].includes(req.method)) {
      return next();
    }
    validateAssetBody((req.body ?? {}) as Record<string, unknown>);
    next();
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
}
