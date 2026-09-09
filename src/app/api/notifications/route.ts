import type { NextRequest } from "next/server";
import { withErrorHandling, jsonOk, NO_STORE_HEADERS } from "@/server/lib/http";
import { requireAuth } from "@/server/middlewares/withAuth";
import { listNotifications } from "@/server/controllers/notificationsController";

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireAuth(req);
  const rows = await listNotifications(auth, req.nextUrl.searchParams);
  return jsonOk(rows, { headers: NO_STORE_HEADERS });
});
