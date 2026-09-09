import type { NextRequest } from "next/server";
import { withErrorHandling, jsonOk } from "@/server/lib/http";
import { requireAuth } from "@/server/middlewares/withAuth";
import { markAllRead } from "@/server/controllers/notificationsController";

export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireAuth(req);
  const result = await markAllRead(auth);
  return jsonOk(result);
});
