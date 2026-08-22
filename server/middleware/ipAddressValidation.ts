import type { NextFunction, Request, Response } from "express";
import {
  assertSafeText,
  isNumeric,
  isValidHostname,
  isValidIpv4,
  isValidMacAddress,
} from "./common.js";

/** Pure validation core - see pcValidation.ts for why this is split out. */
export function validateIpAddressBody(body: Record<string, unknown>): void {
  const departmentId =
    typeof body.department_id === "string" ? body.department_id.trim() : "";
  if (!departmentId) {
    throw new Error("Department is required for all IP address entries.");
  }

  const hostname =
    typeof body.hostname === "string" ? body.hostname.trim() : "";
  if (hostname && !isValidHostname(hostname)) {
    throw new Error(
      "Hostname must start with GBBIT01 and use only letters, numbers, or hyphens.",
    );
  }

  const ip =
    typeof body.ip_address === "string" ? body.ip_address.trim() : "";
  if (ip && !isValidIpv4(ip)) {
    throw new Error("IP address must be a valid IPv4 address.");
  }

  const validStatus = ["assigned", "reserved", "available", "decommissioned"];
  const status = typeof body.status === "string" ? body.status.trim() : "";
  if (status && !validStatus.includes(status)) {
    throw new Error("IP status is invalid.");
  }

  const mac =
    typeof body.mac_address === "string" ? body.mac_address.trim() : "";
  if (mac && !isValidMacAddress(mac)) {
    throw new Error(
      "MAC address must be valid and use colon-separated or 12-character hex format.",
    );
  }

  // Validate port number (1-65535)
  if (body.port !== undefined && body.port !== null) {
    const port = Number(body.port);
    if (!isNumeric(String(body.port)) || port < 1 || port > 65535) {
      throw new Error("Port must be a number between 1 and 65535.");
    }
  }

  // Validate switch port
  const switchPort =
    typeof body.switch_port === "string" ? body.switch_port.trim() : "";
  if (switchPort && !/^[a-zA-Z0-9\-\/\.]+$/.test(switchPort)) {
    throw new Error(
      "Switch port must contain only letters, numbers, hyphens, slashes, or dots.",
    );
  }

  // Validate switch IP
  const switchIp =
    typeof body.switch_ip === "string" ? body.switch_ip.trim() : "";
  if (switchIp && !isValidIpv4(switchIp)) {
    throw new Error("Switch IP must be a valid IPv4 address.");
  }

  // Validate patch panel port
  const patchPanel =
    typeof body.patch_panel_port === "string"
      ? body.patch_panel_port.trim()
      : "";
  if (patchPanel && !/^[a-zA-Z0-9\-\/\.]+$/.test(patchPanel)) {
    throw new Error(
      "Patch panel port must contain only letters, numbers, hyphens, slashes, or dots.",
    );
  }

  // Validate VLAN
  const vlan = typeof body.vlan === "string" ? body.vlan.trim() : "";
  if (vlan && !isNumeric(vlan)) {
    throw new Error("VLAN must be a number.");
  }

  for (const key of [
    "hostname",
    "ip_owner",
    "notes",
    "switch_port",
    "patch_panel_port",
    "vlan",
  ]) {
    const value = body[key];
    if (typeof value === "string") assertSafeText(value, key);
  }
}

export function validateIpAddress(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    if (["GET", "HEAD", "OPTIONS", "DELETE"].includes(req.method)) {
      return next();
    }
    validateIpAddressBody((req.body ?? {}) as Record<string, unknown>);
    next();
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
}
