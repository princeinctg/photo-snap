import { NextResponse } from "next/server";
import { setSessionCookie } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const { name, email, password, studioName } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Name, email, and password are required" }, { status: 400 });
    }

    const newStudioId = `studio_${Date.now()}`;
    const user = {
      userId: `user_${Date.now()}`,
      email,
      name,
      role: "owner",
      studioId: newStudioId,
    };

    setSessionCookie(user);

    return NextResponse.json({ user, success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Registration failed" }, { status: 500 });
  }
}
