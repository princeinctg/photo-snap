import { NextResponse } from "next/server";
import { requireAuth, handleError } from "@/lib/api";
import { ROLE_PERMISSIONS } from "@/lib/permissions";

export async function GET(req: Request) {
  try {
    const auth = await requireAuth(req);
    return NextResponse.json({
      success: true,
      user: {
        id: auth.userId,
        name: auth.name,
        email: auth.email,
        role: auth.role,
        studioId: auth.studioId,
        studioName: auth.studioName,
        emailVerified: auth.emailVerified,
        accountStatus: auth.accountStatus,
      },
      permissions: ROLE_PERMISSIONS[auth.role] || [],
      session: {
        id: auth.sessionId,
        expiresAt: auth.sessionExpiresAt,
      },
    });
  } catch (error) {
    return handleError(error);
  }
}
