import { NextResponse } from "next/server";
import { audit, handleError, parseBody, requireAuth } from "@/lib/api";
import { ProfileModel, UserModel } from "@/lib/models";
import { profileUpdateSchema } from "@/lib/validation";

async function getOrCreateProfile(auth: Awaited<ReturnType<typeof requireAuth>>) {
  const existing = await ProfileModel.findOne({ userId: auth.userId }).lean();
  if (existing) return existing as any;

  const user = await UserModel.findOne({ id: auth.userId }).lean<any>();
  const created = await ProfileModel.create({
    user: user?._id,
    userId: auth.userId,
    studioId: auth.studioId,
    displayName: auth.name,
    profilePhoto: (user as any)?.avatar || "",
    contact: { email: auth.email, phone: (user as any)?.phone || "" },
  });
  return created.toObject();
}

export async function GET(req: Request) {
  try {
    const auth = await requireAuth(req);
    const profile = await getOrCreateProfile(auth);
    return NextResponse.json({
      success: true,
      profile: { ...profile, id: profile.id || String(profile._id) },
      user: {
        id: auth.userId,
        name: auth.name,
        email: auth.email,
        role: auth.role,
        studioId: auth.studioId,
      },
    });
  } catch (error) {
    return handleError(error);
  }
}

export async function PUT(req: Request) {
  try {
    const auth = await requireAuth(req);
    await getOrCreateProfile(auth);
    const body = await parseBody(req, profileUpdateSchema);

    const update: Record<string, unknown> = { ...body };
    const userUpdate: Record<string, unknown> = {};
    if (body.displayName) userUpdate.name = body.displayName;
    if (body.profilePhoto !== undefined) {
      userUpdate.avatar = body.profilePhoto;
      userUpdate.profileImage = body.profilePhoto;
    }
    if (body.contact?.phone) userUpdate.phone = body.contact.phone;

    const profile = await ProfileModel.findOneAndUpdate(
      { userId: auth.userId },
      { $set: update },
      { new: true }
    ).lean();

    if (Object.keys(userUpdate).length > 0) {
      await UserModel.updateOne({ id: auth.userId }, { $set: userUpdate });
    }

    await audit({
      req,
      auth,
      studioId: auth.studioId,
      action: "profile.update",
      entityType: "Profile",
      entityId: auth.userId,
      details: { fields: Object.keys(body) },
    });

    return NextResponse.json({
      success: true,
      profile: { ...(profile as any), id: (profile as any)?.id || String((profile as any)?._id) },
    });
  } catch (error) {
    return handleError(error);
  }
}
