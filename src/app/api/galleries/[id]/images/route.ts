import { NextResponse } from "next/server";
import { getGalleryById, saveGallery } from "@/lib/db";
import { requireStaff, handleError, audit } from "@/lib/api";
import type { GalleryImage } from "@/types";

// POST /api/galleries/[id]/images — add a photo or batch of photos
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireStaff(req, "galleries:write");
    const body = await req.json();

    const gallery = await getGalleryById(params.id);
    if (!gallery) {
      return NextResponse.json({ error: "Gallery not found" }, { status: 404 });
    }

    // Support single image or multiple images batch
    const incomingList = Array.isArray(body.images) ? body.images : [body];
    const newImages: GalleryImage[] = [];

    const existingImages = [...(gallery.images ?? [])];

    for (const item of incomingList) {
      if (!item.url) continue;

      // Automatically construct thumbnail if Cloudinary publicId is present
      let thumbnailUrl = item.thumbnailUrl || item.url;
      if (item.publicId && (!item.thumbnailUrl || item.thumbnailUrl === item.url)) {
        const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
        if (cloudName && cloudName !== "your_cloud_name") {
          thumbnailUrl = `https://res.cloudinary.com/${cloudName}/image/upload/c_fill,g_auto,w_400,h_400,q_auto,f_auto/${item.publicId}`;
        }
      }

      const img: GalleryImage = {
        id: item.id || `img_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        url: item.url,
        publicId: item.publicId || "",
        thumbnailUrl,
        fileName: item.fileName || "",
        format: item.format || "",
        width: item.width || 0,
        height: item.height || 0,
        caption: item.caption || item.fileName?.replace(/\.[^.]+$/, "") || "",
        isFavorite: !!item.isFavorite,
        order: existingImages.length + newImages.length + 1,
        size: item.size || 0,
        clientId: item.clientId || gallery.clientId || "",
        employeeId: item.employeeId || gallery.employeeId || "",
        projectId: item.projectId || gallery.projectId || "",
        createdAt: new Date().toISOString(),
      };
      newImages.push(img);
    }

    if (newImages.length === 0) {
      return NextResponse.json({ error: "No valid image data provided" }, { status: 400 });
    }

    const updatedImages = [...existingImages, ...newImages];
    const coverImage = gallery.coverImage || newImages[0]?.url || "";

    const updatedGallery = await saveGallery({
      ...gallery,
      studioId: auth.studioId,
      images: updatedImages,
      coverImage,
    });

    await audit({
      req,
      auth,
      studioId: auth.studioId,
      action: "gallery.images.add",
      entityType: "Gallery",
      entityId: params.id,
      details: { addedCount: newImages.length },
    });

    return NextResponse.json({
      gallery: updatedGallery,
      images: newImages,
      success: true,
    });
  } catch (error) {
    return handleError(error);
  }
}

// DELETE /api/galleries/[id]/images?imageId=xxx — remove photo and optionally destroy in Cloudinary
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireStaff(req, "galleries:write");
    const { searchParams } = new URL(req.url);
    const imageId = searchParams.get("imageId");

    if (!imageId) {
      return NextResponse.json({ error: "imageId query param required" }, { status: 400 });
    }

    const gallery = await getGalleryById(params.id);
    if (!gallery) {
      return NextResponse.json({ error: "Gallery not found" }, { status: 404 });
    }

    const targetImg = gallery.images?.find((img) => img.id === imageId);
    if (!targetImg) {
      return NextResponse.json({ error: "Image not found in gallery" }, { status: 404 });
    }

    // If Cloudinary is configured and publicId exists, attempt Cloudinary deletion
    if (
      targetImg.publicId &&
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET &&
      process.env.CLOUDINARY_CLOUD_NAME !== "your_cloud_name"
    ) {
      try {
        const cloudinary = (await import("cloudinary")).v2;
        cloudinary.config({
          cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
          api_key: process.env.CLOUDINARY_API_KEY,
          api_secret: process.env.CLOUDINARY_API_SECRET,
          secure: true,
        });
        await cloudinary.uploader.destroy(targetImg.publicId);
      } catch (err) {
        console.warn("Cloudinary photo delete warning:", err);
      }
    }

    const updatedImages = (gallery.images ?? []).filter((img) => img.id !== imageId);
    let coverImage = gallery.coverImage;
    if (targetImg.url === gallery.coverImage) {
      coverImage = updatedImages[0]?.url ?? "";
    }

    const updatedGallery = await saveGallery({
      ...gallery,
      studioId: auth.studioId,
      images: updatedImages,
      coverImage,
    });

    await audit({
      req,
      auth,
      studioId: auth.studioId,
      action: "gallery.images.delete",
      entityType: "Gallery",
      entityId: params.id,
      details: { imageId },
    });

    return NextResponse.json({ gallery: updatedGallery, success: true });
  } catch (error) {
    return handleError(error);
  }
}

// PUT /api/galleries/[id]/images — replace or update an existing photo
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireStaff(req, "galleries:write");
    const body = await req.json();
    const { imageId, url, publicId, caption, thumbnailUrl, fileName, size } = body;

    if (!imageId) {
      return NextResponse.json({ error: "imageId is required" }, { status: 400 });
    }

    const gallery = await getGalleryById(params.id);
    if (!gallery) {
      return NextResponse.json({ error: "Gallery not found" }, { status: 404 });
    }

    const images = [...(gallery.images || [])];
    const idx = images.findIndex((img) => img.id === imageId);
    if (idx === -1) {
      return NextResponse.json({ error: "Image not found in gallery" }, { status: 404 });
    }

    const prevImg = images[idx];
    images[idx] = {
      ...prevImg,
      url: url || prevImg.url,
      publicId: publicId !== undefined ? publicId : prevImg.publicId,
      thumbnailUrl: thumbnailUrl || prevImg.thumbnailUrl || url || prevImg.url,
      fileName: fileName || prevImg.fileName,
      size: size !== undefined ? size : prevImg.size,
      caption: caption !== undefined ? caption : prevImg.caption,
    };

    let coverImage = gallery.coverImage;
    if (prevImg.url === gallery.coverImage && url) {
      coverImage = url;
    }

    const updatedGallery = await saveGallery({
      ...gallery,
      studioId: auth.studioId,
      images,
      coverImage,
    });

    return NextResponse.json({ gallery: updatedGallery, image: images[idx], success: true });
  } catch (error) {
    return handleError(error);
  }
}

// PATCH /api/galleries/[id]/images — set cover image or toggle favorite
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireStaff(req, "galleries:write");
    const body = await req.json();
    const { imageId, isCover, isFavorite, caption } = body as {
      imageId: string;
      isCover?: boolean;
      isFavorite?: boolean;
      caption?: string;
    };

    const gallery = await getGalleryById(params.id);
    if (!gallery) {
      return NextResponse.json({ error: "Gallery not found" }, { status: 404 });
    }

    const targetImg = gallery.images?.find((img) => img.id === imageId);
    if (!targetImg) {
      return NextResponse.json({ error: "Image not found in gallery" }, { status: 404 });
    }

    let coverImage = gallery.coverImage;
    if (isCover !== undefined) {
      coverImage = targetImg.url;
    }

    const updatedImages = (gallery.images || []).map((img) => {
      if (img.id !== imageId) return img;
      return {
        ...img,
        isFavorite: isFavorite !== undefined ? isFavorite : img.isFavorite,
        caption: caption !== undefined ? caption : img.caption,
      };
    });

    const updatedGallery = await saveGallery({
      ...gallery,
      studioId: auth.studioId,
      coverImage,
      images: updatedImages,
    });

    return NextResponse.json({ gallery: updatedGallery, success: true });
  } catch (error) {
    return handleError(error);
  }
}
