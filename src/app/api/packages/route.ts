import { NextResponse } from "next/server";
import { getPackages, savePackage } from "@/lib/db";
import { DEFAULT_STUDIO_ID } from "@/lib/demo-data";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const studioId = searchParams.get("studioId") || DEFAULT_STUDIO_ID;
    const packages = await getPackages(studioId);
    return NextResponse.json({ packages });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to load packages" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body.name || body.price === undefined) {
      return NextResponse.json({ error: "Package name and price are required" }, { status: 400 });
    }

    const saved = await savePackage(body);
    return NextResponse.json({ package: saved, success: true }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to save package" }, { status: 500 });
  }
}
