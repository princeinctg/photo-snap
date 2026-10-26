import { NextResponse } from "next/server";
import { getGalleries, saveGallery } from "@/lib/db";
import { DEFAULT_STUDIO_ID } from "@/lib/demo-data";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const studioId = searchParams.get("studioId") || DEFAULT_STUDIO_ID;
    const galleries = await getGalleries(studioId);
    return NextResponse.json({ galleries });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to load galleries" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body.title) {
      return NextResponse.json({ error: "Gallery title is required" }, { status: 400 });
    }

    const saved = await saveGallery(body);
    return NextResponse.json({ gallery: saved, success: true }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to save gallery" }, { status: 500 });
  }
}
