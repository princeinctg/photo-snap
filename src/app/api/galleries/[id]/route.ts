import { NextResponse } from "next/server";
import { getGalleryById, saveGallery, deleteGallery } from "@/lib/db";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const gallery = await getGalleryById(params.id);
    if (!gallery) {
      return NextResponse.json({ error: "Gallery not found" }, { status: 404 });
    }

    // If password protected and requested via public link without auth, return sanitized meta
    const { searchParams } = new URL(req.url);
    const pwd = searchParams.get("password");

    if (gallery.isPasswordProtected && gallery.accessPassword && (!pwd || pwd !== gallery.accessPassword)) {
      return NextResponse.json({
        locked: true,
        title: gallery.title,
        coverImage: gallery.coverImage,
        description: gallery.description,
        isPasswordProtected: true,
      });
    }

    return NextResponse.json({ gallery, locked: false });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to load gallery" }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const updated = await saveGallery({ ...body, id: params.id });
    return NextResponse.json({ gallery: updated, success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to update gallery" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const success = await deleteGallery(params.id);
    return NextResponse.json({ success });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to delete gallery" }, { status: 500 });
  }
}
