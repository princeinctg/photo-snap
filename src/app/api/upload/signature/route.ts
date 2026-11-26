import { NextResponse } from "next/server";
import { handleError, jsonError, jsonOk, requireAuth } from "@/lib/api";

export async function POST(req: Request) {
  try {
    const auth = await requireAuth(req);

    if (auth.role === "client") {
      return jsonError("Clients do not have permission to upload photos.", 403, "FORBIDDEN");
    }

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    const cloudinaryConfigured =
      cloudName &&
      apiKey &&
      apiSecret &&
      cloudName !== "your_cloud_name";

    if (!cloudinaryConfigured) {
      return jsonOk({
        configured: false,
        message: "Cloudinary is not configured on this environment. Fallback to server proxy upload.",
      });
    }

    const body = await req.json().catch(() => ({}));
    const rawFolder = (body.folder as string) || "photo-studio-os";
    // Sanitize folder path
    const folder = rawFolder.replace(/[^a-zA-Z0-9_\-\/]/g, "").slice(0, 100);

    const timestamp = Math.round(Date.now() / 1000);
    const paramsToSign: Record<string, string | number> = {
      folder,
      timestamp,
    };

    const cloudinary = (await import("cloudinary")).v2;
    const signature = cloudinary.utils.api_sign_request(paramsToSign, apiSecret);

    return jsonOk({
      configured: true,
      cloudName,
      apiKey,
      timestamp,
      folder,
      signature,
    });
  } catch (error) {
    return handleError(error);
  }
}
