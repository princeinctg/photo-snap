import { NextResponse } from "next/server";
import { getGalleryById, saveGallery, deleteGallery } from "@/lib/db";
import { requireAuth, requireStaff, handleError, audit, ApiError } from "@/lib/api";
import { ClientModel, EmployeeModel } from "@/lib/models";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const gallery = await getGalleryById(params.id);
    if (!gallery) {
      return NextResponse.json({ error: "Gallery not found" }, { status: 404 });
    }

    // Check if user is authenticated
    const authHeader = req.headers.get("cookie") || "";
    const isPublicAccess = !authHeader.includes("photo_studio_session");

    // If password protected and requested via public link without matching password
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

    // Role-based check if signed in as client
    if (!isPublicAccess) {
      try {
        const auth = await requireAuth(req);
        if (auth.role === "client") {
          const clientDocs = await ClientModel.find({ studioId: auth.studioId, userId: auth.userId })
            .select("id")
            .lean();
          const clientIds = clientDocs.map((c: any) => c.id);
          if (gallery.clientId && !clientIds.includes(gallery.clientId)) {
            throw new ApiError(403, "You do not have permission to view this client gallery.", "FORBIDDEN");
          }
        }
      } catch (err: any) {
        if (err instanceof ApiError && err.status === 403) throw err;
      }
    }

    return NextResponse.json({ gallery, locked: false, success: true });
  } catch (error) {
    return handleError(error);
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireStaff(req, "galleries:write");
    const body = await req.json();

    const existing = await getGalleryById(params.id);
    if (!existing) {
      return NextResponse.json({ error: "Gallery not found" }, { status: 404 });
    }

    const updated = await saveGallery({ ...existing, ...body, id: params.id, studioId: auth.studioId });

    await audit({
      req,
      auth,
      studioId: auth.studioId,
      action: "gallery.update",
      entityType: "Gallery",
      entityId: params.id,
      details: { title: updated.title },
    });

    return NextResponse.json({ gallery: updated, success: true });
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireStaff(req, "galleries:write");
    const success = await deleteGallery(params.id, auth.studioId);

    await audit({
      req,
      auth,
      studioId: auth.studioId,
      action: "gallery.delete",
      entityType: "Gallery",
      entityId: params.id,
    });

    return NextResponse.json({ success });
  } catch (error) {
    return handleError(error);
  }
}
