import type { NextRequest } from "next/server";
import { withErrorHandling, jsonOk, NO_STORE_HEADERS, ApiError } from "@/server/lib/http";
import { requireAuth, requireRole } from "@/server/middlewares/withAuth";
import {
  backupFilename,
  createBackup,
  recordRestoreAudit,
  restoreBackup,
} from "@/server/lib/backup";

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireAuth(req);
  requireRole(auth, ["admin", "audit"]);
  const backup = await createBackup();
  return new Response(JSON.stringify(backup), {
    headers: {
      ...NO_STORE_HEADERS,
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${backupFilename()}"`,
    },
  });
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireAuth(req);
  requireRole(auth, ["admin"]);
  const backup = await req.json();
  try {
    await restoreBackup(backup);
  } catch (error) {
    await recordRestoreAudit(
      auth,
      "failed",
      error instanceof Error ? error.message : "Restore failed",
    );
    throw new ApiError(400, error instanceof Error ? error.message : "Restore failed");
  }
  await recordRestoreAudit(auth, "succeeded");
  return jsonOk({ ok: true }, { headers: NO_STORE_HEADERS });
});