import { NextResponse } from "next/server";
import { ApiError, audit, handleError, parseBody, requireAuth } from "@/lib/api";
import { can } from "@/lib/permissions";
import { ProfileModel, UserModel } from "@/lib/models";
import { profileUpdateSchema } from "@/lib/validation";

export async function GET(req: Request, { params }: { params: { userId: string } }) {
  try {
    const auth = await requireAuth(req);
    const isSelf = params.userId === auth.userId;
    if (!isSelf && !can(auth.role, "profiles:read")) {
      throw new ApiError(403, "You do not have permission to view this profile.", "FORBIDDEN");
    }

    const profile = await ProfileModel.findOne({
      userId: params.userId,
      studioId: auth.studioId,
    }).lean();
    if (!profile) throw new ApiError(404, "Profile not found", "NOT_FOUND");

    return NextResponse.json({
      success: true,
      profile: { ...profile, id: (profile as any).id || String((profile as any)._id) },
    });
  } catch (error) {
    return handleError(error);
  }
}

export async function PUT(req: Request, { params }: { params: { userId: string } }) {
  try {
    const auth = await requireAuth(req);
    const isSelf = params.userId === auth.userId;
    if (!isSelf && !can(auth.role, "profiles:write")) {
      throw new ApiError(403, "You do not have permission to update this profile.", "FORBIDDEN");
    }
    if (!isSelf && auth.role === "employee") {
      throw new ApiError(403, "Employees can only edit their own profile.", "FORBIDDEN");
    }

    const body = await parseBody(req, profileUpdateSchema);
    const profile = await ProfileModel.findOneAndUpdate(
      { userId: params.userId, studioId: auth.studioId },
      { $set: body },
      { new: true }
    ).lean();

    if (!profile) throw new ApiError(404, "Profile not found", "NOT_FOUND");

    if (body.displayName || body.profilePhoto || body.contact?.phone) {
      const userUpdate: Record<string, unknown> = {};
      if (body.displayName) userUpdate.name = body.displayName;
      if (body.profilePhoto !== undefined) {
        userUpdate.avatar = body.profilePhoto;
        userUpdate.profileImage = body.profilePhoto;
      }
      if (body.contact?.phone) userUpdate.phone = body.contact.phone;
      await UserModel.updateOne({ id: params.userId }, { $set: userUpdate });
    }

    await audit({
      req,
      auth,
      studioId: auth.studioId,
      action: "profile.update",
      entityType: "Profile",
      entityId: params.userId,
      details: { byAdmin: !isSelf },
    });

    return NextResponse.json({
      success: true,
      profile: { ...(profile as any), id: (profile as any).id || String((profile as any)._id) },
    });
  } catch (error) {
    return handleError(error);
  }
}
