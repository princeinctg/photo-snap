import { NextResponse } from "next/server";
import { handleError, requireAuth, audit } from "@/lib/api";
import { listSessions, revokeAllSessions } from "@/lib/session";

export async function GET(req: Request) {
  try {
    const auth = await requireAuth(req);
    const sessions = await listSessions(auth.userId, auth.sessionId);
    return NextResponse.json({ success: true, sessions });
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(req: Request) {
  try {
    const auth = await requireAuth(req);
    const revoked = await revokeAllSessions(auth.userId, auth.sessionId);
    await audit({
      req,
      auth,
      studioId: auth.studioId,
      action: "session.revoke_others",
      entityType: "Session",
      details: { revoked },
    });
    return NextResponse.json({
      success: true,
      message: `Revoked ${revoked} other session${revoked === 1 ? "" : "s"}.`,
      revoked,
    });
  } catch (error) {
    return handleError(error);
  }
}
