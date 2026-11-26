import { NextResponse } from "next/server";
import { logoutUser } from "@/lib/auth";
import { handleError } from "@/lib/api";

export async function POST(req: Request) {
  try {
    await logoutUser(req);
    return NextResponse.json({ success: true, message: "Logged out successfully" });
  } catch (error) {
    return handleError(error);
  }
}
