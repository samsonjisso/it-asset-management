import type { NextRequest } from "next/server";
import { withErrorHandling, jsonOk } from "@/server/lib/http";
import { requireAuth } from "@/server/middlewares/withAuth";
import { parseBody } from "@/server/middlewares/validate";
import { transferOwnershipSchema } from "@/server/validators/profiles.schema";
import { transferOwnership } from "@/server/controllers/profilesController";

export const POST = withErrorHandling(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const auth = await requireAuth(req);
    const body = await parseBody(req, transferOwnershipSchema);
    const { id } = await params;
    const row = await transferOwnership(auth, id, body.password);
    return jsonOk(row);
  },
);
