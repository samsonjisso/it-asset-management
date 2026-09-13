import type { NextRequest } from "next/server";
import { listNotifications } from "@/server/controllers/notificationsController";
import { requireAuth } from "@/server/middlewares/withAuth";
import { ApiError, jsonError } from "@/server/lib/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  let auth;
  try {
    auth = await requireAuth(req);
  } catch (error) {
    if (error instanceof ApiError) return jsonError(error.status, error.message);
    return jsonError(500, "Internal server error");
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      let stopped = false;
      let checking = false;
      let lastSignature = "";

      const close = () => {
        if (stopped) return;
        stopped = true;
        clearInterval(pollTimer);
        clearInterval(heartbeatTimer);
        controller.close();
      };

      const sendNotifications = async () => {
        if (stopped || checking) return;
        checking = true;
        try {
          const rows = await listNotifications(
            auth,
            new URLSearchParams({ is_read: "false", limit: "20" }),
          );
          const signature = rows
            .map((row) => `${row.id}:${row.is_read}:${row.created_at}`)
            .join("|");
          if (signature !== lastSignature) {
            lastSignature = signature;
            controller.enqueue(
              encoder.encode(`event: notifications\ndata: ${JSON.stringify(rows)}\n\n`),
            );
          }
        } catch {
          // The existing client-side refresh remains the fallback if a poll fails.
        } finally {
          checking = false;
        }
      };

      const pollTimer = setInterval(sendNotifications, 1000);
      const heartbeatTimer = setInterval(() => {
        if (!stopped) controller.enqueue(encoder.encode(": keep-alive\n\n"));
      }, 15000);

      req.signal.addEventListener("abort", close, { once: true });
      void sendNotifications();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
