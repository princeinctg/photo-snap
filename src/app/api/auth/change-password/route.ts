import { NextResponse } from "next/server";
import { changePassword } from "@/lib/auth";
import { handleError, parseBody, requireAuth } from "@/lib/api";
import { changePasswordSchema } from "@/lib/validation";

export async function POST(req: Request) {
  try {
    const auth = await requireAuth(req);
    const body = await parseBody(req, changePasswordSchema);
    const result = await changePassword({
      auth,
      currentPassword: body.currentPassword,
      newPassword: body.newPassword,
      req,
    });
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    return handleError(error);
  }
}
