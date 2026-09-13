import type { NextRequest } from "next/server";
import { withErrorHandling, jsonOk, NO_STORE_HEADERS } from "@/server/lib/http";
import { parseBody } from "@/server/middlewares/validate";
import { loginSchema } from "@/server/validators/auth.schema";
import {
  login,
  checkLoginRateLimit,
} from "@/server/controllers/authController";
import { AUTH_COOKIE_NAME } from "@/server/lib/auth";

export const POST = withErrorHandling(async (req: NextRequest) => {
  const forwardedFor = req.headers.get("x-forwarded-for");
  const ip =
    req.headers.get("x-real-ip")?.trim() ||
    forwardedFor?.split(",")[0]?.trim() ||
    "unknown";
  checkLoginRateLimit(ip);
  const body = await parseBody(req, loginSchema);
  const result = await login(body);
  const { token, ...publicResult } = result;
  const response = jsonOk(publicResult, { headers: NO_STORE_HEADERS });
  response.cookies.set(AUTH_COOKIE_NAME, result.token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.COOKIE_SECURE === "true",
    path: "/",
    maxAge: 8 * 60 * 60,
  });
  return response;
});
