import type { NextRequest } from "next/server";
import { withErrorHandling, jsonOk } from "@/server/lib/http";
import { requireAuth } from "@/server/middlewares/withAuth";
import { parseBody } from "@/server/middlewares/validate";
import { markReadSchema } from "@/server/validators/notifications.schema";
import {
  markRead,
  deleteNotification,
} from "@/server/controllers/notificationsController";

export const PATCH = withErrorHandling(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const auth = await requireAuth(req);
    const body = await parseBody(req, markReadSchema);
    const row = await markRead(auth, id, body.is_read);
    return jsonOk(row);
  },
);

export const DELETE = withErrorHandling(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const auth = await requireAuth(req);
    const result = await deleteNotification(auth, id);
    return jsonOk(result);
  },
);
