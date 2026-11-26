import { NextResponse } from "next/server";
import { ApiError, audit, handleError, parseBody, requireAuth } from "@/lib/api";
import { assignableRoles } from "@/lib/permissions";
import { UserModel } from "@/lib/models";
import { hashPassword } from "@/lib/auth";
import { revokeAllSessions } from "@/lib/session";
import { userUpdateSchema } from "@/lib/validation";

async function findUser(id: string, studioId: string) {
  const user = await UserModel.findOne({ id, studioId }).select("-passwordHash").lean();
  if (!user) throw new ApiError(404, "User not found", "NOT_FOUND");
  return user as any;
}

function assertCanManage(actorRole: string, targetRole: string, actorId: string, targetId: string) {
  if (actorId === targetId) {
    throw new ApiError(400, "You cannot modify your own role or account status here.", "SELF_EDIT");
  }
  if (targetRole === "super_admin" && actorRole !== "super_admin") {
    throw new ApiError(403, "Only a super admin can manage a super admin.", "FORBIDDEN");
  }
  if (targetRole === "admin" && actorRole !== "super_admin") {
    throw new ApiError(403, "Only a super admin can manage an admin.", "FORBIDDEN");
  }
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuth(req, "users:read");
    const user = await findUser(params.id, auth.studioId);
    return NextResponse.json({ success: true, user: { ...user, id: user.id || String(user._id) } });
  } catch (error) {
    return handleError(error);
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuth(req, "users:write");
    const existing = await findUser(params.id, auth.studioId);
    assertCanManage(auth.role, existing.role, auth.userId, params.id);

    const body = await parseBody(req, userUpdateSchema);

    if (body.role) {
      const allowed = assignableRoles(auth.role);
      if (!allowed.includes(body.role)) {
        throw new ApiError(403, `Your role cannot assign the ${body.role} role.`, "FORBIDDEN");
      }
    }

    const update: Record<string, unknown> = { ...body };
    delete update.password;
    if (body.password) {
      update.passwordHash = await hashPassword(body.password);
      update.passwordChangedAt = new Date();
    }
    if (body.email) {
      const duplicate = await UserModel.findOne({
        email: body.email,
        id: { $ne: params.id },
      }).lean();
      if (duplicate) {
        throw new ApiError(409, "A user with this email address already exists.", "DUPLICATE");
      }
    }

    const updated = await UserModel.findOneAndUpdate(
      { id: params.id, studioId: auth.studioId },
      { $set: update },
      { new: true }
    )
      .select("-passwordHash")
      .lean();

    if (body.accountStatus && body.accountStatus !== "active") {
      await revokeAllSessions(params.id);
    }
    if (body.password) {
      await revokeAllSessions(params.id);
    }

    await audit({
      req,
      auth,
      studioId: auth.studioId,
      action: "user.update",
      entityType: "User",
      entityId: params.id,
      details: { fields: Object.keys(body), role: body.role, accountStatus: body.accountStatus },
    });

    return NextResponse.json({
      success: true,
      user: { ...(updated as any), id: params.id },
    });
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuth(req, "users:write");
    const existing = await findUser(params.id, auth.studioId);
    assertCanManage(auth.role, existing.role, auth.userId, params.id);

    await UserModel.updateOne(
      { id: params.id, studioId: auth.studioId },
      { $set: { accountStatus: "deactivated" } }
    );
    await revokeAllSessions(params.id);

    await audit({
      req,
      auth,
      studioId: auth.studioId,
      action: "user.deactivate",
      entityType: "User",
      entityId: params.id,
      details: { email: existing.email },
    });

    return NextResponse.json({ success: true, message: "User account deactivated." });
  } catch (error) {
    return handleError(error);
  }
}
