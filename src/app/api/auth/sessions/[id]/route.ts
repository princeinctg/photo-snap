import { NextResponse } from "next/server";
import { handleError, requireAuth, ApiError, audit } from "@/lib/api";
import { revokeSession } from "@/lib/session";

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuth(req);
    const revoked = await revokeSession(params.id, auth.userId);
    if (!revoked) {
      throw new ApiError(404, "Session not found or already revoked.", "NOT_FOUND");
    }
    await audit({
      req,
      auth,
      studioId: auth.studioId,
      action: "session.revoke",
      entityType: "Session",
      entityId: params.id,
    });
    return NextResponse.json({ success: true, message: "Session revoked." });
  } catch (error) {
    return handleError(error);
  }
}
