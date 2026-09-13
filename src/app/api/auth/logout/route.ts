import { withErrorHandling, jsonOk, NO_STORE_HEADERS } from "@/server/lib/http";
import { AUTH_COOKIE_NAME } from "@/server/lib/auth";

export const POST = withErrorHandling(async () => {
  const response = jsonOk({ ok: true }, { headers: NO_STORE_HEADERS });
  response.cookies.set(AUTH_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.COOKIE_SECURE === "true",
    path: "/",
    maxAge: 0,
  });
  return response;
});