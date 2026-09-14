import type { NextRequest } from "next/server";
import { withErrorHandling, jsonOk, NO_STORE_HEADERS } from "@/server/lib/http";
import { AUTH_COOKIE_NAME } from "@/server/lib/auth";

export const POST = withErrorHandling(async (req: NextRequest) => {
  const response = jsonOk({ ok: true }, { headers: NO_STORE_HEADERS });
  const isHttps =
    req.headers.get("x-forwarded-proto") === "https" ||
    req.nextUrl.protocol === "https:";
  response.cookies.set(AUTH_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.COOKIE_SECURE === "true" && isHttps,
    path: "/",
    maxAge: 0,
  });
  return response;
});