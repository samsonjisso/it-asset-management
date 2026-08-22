import type { NextFunction, Request, Response } from "express";
import { assertSafeText, containsUnsafeScript } from "./common.js";

/**
 * Pure validation core - see pcValidation.ts for why this is split out.
 * Unlike the others, an empty body is valid here (partial PATCH support),
 * so this only checks fields that are actually present.
 */
export function validateDepartmentBody(body: Record<string, unknown>): void {
  if (Object.keys(body).length === 0) return;

  const departmentName =
    typeof body.name === "string" ? body.name.trim() : "";
  if (
    body.name !== undefined &&
    body.name !== null &&
    body.name !== "" &&
    !departmentName
  ) {
    throw new Error("Department name is required.");
  }
  if (departmentName && containsUnsafeScript(departmentName)) {
    throw new Error(
      "Department name contains invalid or unsafe script characters.",
    );
  }

  if (
    body.is_branch !== undefined &&
    body.is_branch !== null &&
    body.is_branch !== "" &&
    typeof body.is_branch !== "boolean"
  ) {
    const normalized = String(body.is_branch).trim().toLowerCase();
    if (!["true", "false", "1", "0"].includes(normalized)) {
      throw new Error("Department branch flag must be true or false.");
    }
  }

  if (typeof body.description === "string") {
    assertSafeText(body.description, "description");
  }
}

export function validateDepartment(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    if (["GET", "HEAD", "OPTIONS", "DELETE"].includes(req.method)) {
      return next();
    }
    if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
      return next();
    }
    validateDepartmentBody(req.body as Record<string, unknown>);
    next();
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
}
