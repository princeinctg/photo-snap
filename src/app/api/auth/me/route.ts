import { NextResponse } from "next/server";
import { getSessionUser, defaultAdminUser } from "@/lib/auth";

export async function GET() {
  const session = getSessionUser();
  if (!session) {
    // Return default owner session for effortless onboarding or demo
    return NextResponse.json({ user: defaultAdminUser });
  }
  return NextResponse.json({ user: session });
}
