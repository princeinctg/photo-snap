import { NextResponse } from "next/server";
import { setSessionCookie, defaultAdminUser, comparePassword } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    // Default owner credentials check or demo bypass
    const defaultEmail = process.env.INITIAL_ADMIN_EMAIL || "owner@photostudio.com";
    const defaultPassword = process.env.INITIAL_ADMIN_PASSWORD || "StudioAdmin123!";

    if (
      (email.toLowerCase() === defaultEmail.toLowerCase() && password === defaultPassword) ||
      (email.toLowerCase() === "demo@photostudio.com" && password === "demo123")
    ) {
      const session = {
        userId: defaultAdminUser.id,
        email: defaultAdminUser.email,
        name: defaultAdminUser.name,
        role: defaultAdminUser.role,
        studioId: defaultAdminUser.studioId,
      };

      setSessionCookie(session);
      return NextResponse.json({ user: defaultAdminUser, success: true });
    }

    // For any other owner account
    const session = {
      userId: `user_${Date.now()}`,
      email,
      name: email.split("@")[0].toUpperCase() + " (Studio Owner)",
      role: "owner",
      studioId: "studio_primary_001",
    };
    setSessionCookie(session);

    return NextResponse.json({ user: session, success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Login failed" }, { status: 500 });
  }
}
