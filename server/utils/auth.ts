import jwt from "jsonwebtoken";
import type { NextFunction, Request, Response } from "express";
import type { AuthProfile, UserRole } from "../types.js";

const JWT_SECRET = process.env.JWT_SECRET || "dev-only-secret-change-me";
const JWT_EXPIRES_IN = "7d";

export function signToken(profile: AuthProfile): string {
  return jwt.sign(
    { sub: profile.id, email: profile.email, role: profile.role },
    JWT_SECRET,
    {
      expiresIn: JWT_EXPIRES_IN,
    },
  );
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Not authenticated" });
  try {
    const payload = jwt.verify(token, JWT_SECRET) as {
      sub: string;
      email: string;
      role: UserRole;
    };
    req.auth = { id: payload.sub, email: payload.email, role: payload.role };
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired session" });
  }
}

export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.auth || !roles.includes(req.auth.role)) {
      return res
        .status(403)
        .json({ error: "You do not have permission to perform this action" });
    }
    next();
  };
}

export const WRITE_ROLES: UserRole[] = [
  "admin",
  "manager",
  "register_user",
  "editor",
];
export const MANAGE_ROLES: UserRole[] = ["admin", "manager", "editor"];
