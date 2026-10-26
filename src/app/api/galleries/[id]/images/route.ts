import { NextResponse } from "next/server";
import { getGalleryById, saveGallery } from "@/lib/db";
import type { GalleryImage } from "@/types";

// POST /api/galleries/[id]/images — add a photo URL to the gallery's images array
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const { url, caption } = body as { url: string; caption?: string };

    if (!url) {
      return NextResponse.json({ error: "Image URL required" }, { status: 400 });
    }

    const gallery = await getGalleryById(params.id);
    if (!gallery) {
      return NextResponse.json({ error: "Gallery not found" }, { status: 404 });
    }

    const newImage: GalleryImage = {
      id: `img_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      url,
      caption: caption || "",
      isFavorite: false,
      order: (gallery.images?.length ?? 0) + 1,
      createdAt: new Date().toISOString(),
    };

    const updatedGallery = await saveGallery({
      ...gallery,
      images: [...(gallery.images ?? []), newImage],
      // Update cover image if this is the first photo
      coverImage: gallery.coverImage || url,
    });

    return NextResponse.json({ gallery: updatedGallery, image: newImage, success: true });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to add image";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// DELETE /api/galleries/[id]/images?imageId=xxx — remove a single photo
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const { searchParams } = new URL(req.url);
    const imageId = searchParams.get("imageId");

    if (!imageId) {
      return NextResponse.json({ error: "imageId query param required" }, { status: 400 });
    }

    const gallery = await getGalleryById(params.id);
    if (!gallery) {
      return NextResponse.json({ error: "Gallery not found" }, { status: 404 });
    }

    const updatedImages = (gallery.images ?? []).filter((img) => img.id !== imageId);

    // Update coverImage if the removed image was the cover
    let coverImage = gallery.coverImage;
    const removedImg = gallery.images?.find((img) => img.id === imageId);
    if (removedImg && removedImg.url === gallery.coverImage) {
      coverImage = updatedImages[0]?.url ?? "";
    }

    const updatedGallery = await saveGallery({ ...gallery, images: updatedImages, coverImage });
    return NextResponse.json({ gallery: updatedGallery, success: true });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to delete image";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// PATCH /api/galleries/[id]/images — set cover image from an existing image ID
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const { imageId } = body as { imageId: string };

    const gallery = await getGalleryById(params.id);
    if (!gallery) {
      return NextResponse.json({ error: "Gallery not found" }, { status: 404 });
    }

    const targetImg = gallery.images?.find((img) => img.id === imageId);
    if (!targetImg) {
      return NextResponse.json({ error: "Image not found in gallery" }, { status: 404 });
    }

    const updatedGallery = await saveGallery({ ...gallery, coverImage: targetImg.url });
    return NextResponse.json({ gallery: updatedGallery, success: true });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to update cover";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
