import { NextResponse } from "next/server";
import { handleError, requireAuth } from "@/lib/api";
import { ProfileModel } from "@/lib/models";

export async function GET(req: Request) {
  try {
    const auth = await requireAuth(req, "profiles:read");
    const profiles = await ProfileModel.find({ studioId: auth.studioId })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      profiles: profiles.map((profile: any) => ({
        ...profile,
        id: profile.id || String(profile._id),
      })),
    });
  } catch (error) {
    return handleError(error);
  }
}
