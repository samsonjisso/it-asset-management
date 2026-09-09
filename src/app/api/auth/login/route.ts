import type { NextRequest } from "next/server";
import { withErrorHandling, jsonOk } from "@/server/lib/http";
import { parseBody } from "@/server/middlewares/validate";
import { loginSchema } from "@/server/validators/auth.schema";
import {
  login,
  checkLoginRateLimit,
} from "@/server/controllers/authController";

export const POST = withErrorHandling(async (req: NextRequest) => {
  const ip = req.headers.get("x-forwarded-for") || "unknown";
  checkLoginRateLimit(ip);
  const body = await parseBody(req, loginSchema);
  const result = await login(body);
  return jsonOk(result);
});
