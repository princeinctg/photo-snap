import { NextResponse } from "next/server";
import { getPackages, savePackage } from "@/lib/db";
import { getAuthStudioId } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const studioId = getAuthStudioId(req);
    const packages = await getPackages(studioId);
    return NextResponse.json({ packages });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to load packages" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const studioId = getAuthStudioId(req);
    const body = await req.json();
    if (!body.name || body.price === undefined) {
      return NextResponse.json({ error: "Package name and price are required" }, { status: 400 });
    }

    const saved = await savePackage({ ...body, studioId });
    return NextResponse.json({ package: saved, success: true }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to create package" }, { status: 500 });
  }
}
