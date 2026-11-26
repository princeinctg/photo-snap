import { NextResponse } from "next/server";
import { logoutUser } from "@/lib/auth";

export async function POST(req: Request) {
  await logoutUser(req);
  return NextResponse.json({ success: true, message: "Logged out successfully" });
}
