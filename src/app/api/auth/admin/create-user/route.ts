import type { NextRequest } from "next/server";
import { withErrorHandling, jsonOk } from "@/server/lib/http";
import { requireAuth } from "@/server/middlewares/withAuth";
import { parseBody } from "@/server/middlewares/validate";
import { createUserSchema } from "@/server/validators/auth.schema";
import { adminCreateUser } from "@/server/controllers/authController";

export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireAuth(req);
  const body = await parseBody(req, createUserSchema);
  const result = await adminCreateUser(auth, body);
  return jsonOk(result, 201);
});
