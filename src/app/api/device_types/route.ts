import type { NextRequest } from "next/server";
import { withErrorHandling, jsonOk, NO_STORE_HEADERS } from "@/server/lib/http";
import { requireAuth } from "@/server/middlewares/withAuth";
import { parseBody } from "@/server/middlewares/validate";
import { listRows, createRow } from "@/server/controllers/crudEngine";
import { deviceTypesConfig } from "@/server/controllers/crudConfig";
import { passthroughSchema } from "@/server/validators/common";

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireAuth(req);
  const rows = await listRows(
    deviceTypesConfig,
    auth,
    req.nextUrl.searchParams,
  );
  return jsonOk(rows, { headers: NO_STORE_HEADERS });
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireAuth(req);
  const body = await parseBody(req, passthroughSchema);
  const row = await createRow(
    deviceTypesConfig,
    auth,
    body as Record<string, unknown>,
  );
  return jsonOk(row, { status: 201, headers: NO_STORE_HEADERS });
});
