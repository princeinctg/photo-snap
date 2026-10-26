import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

// ---------------------------------------------------------------------------
// Magic-byte signatures for allowed image types
// ---------------------------------------------------------------------------
const MAGIC_SIGNATURES: { bytes: number[]; mask?: number[]; mime: string }[] = [
  { bytes: [0xff, 0xd8, 0xff], mime: "image/jpeg" },          // JPEG
  { bytes: [0x89, 0x50, 0x4e, 0x47], mime: "image/png" },     // PNG
  { bytes: [0x47, 0x49, 0x46], mime: "image/gif" },            // GIF
  { bytes: [0x52, 0x49, 0x46, 0x46], mime: "image/webp" },     // WebP (RIFF header — confirmed below)
];

function detectMimeByMagic(buf: Buffer): string | null {
  for (const sig of MAGIC_SIGNATURES) {
    const matches = sig.bytes.every((b, i) => buf[i] === b);
    if (!matches) continue;
    // WebP also requires "WEBP" at offset 8
    if (sig.mime === "image/webp") {
      const riffType = buf.slice(8, 12).toString("ascii");
      if (riffType !== "WEBP") continue;
    }
    return sig.mime;
  }
  return null;
}

const ALLOWED_MIMES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
]);

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

// ---------------------------------------------------------------------------
// Cloudinary upload helper (only used when env vars are present)
// ---------------------------------------------------------------------------
async function uploadToCloudinary(
  buffer: Buffer,
  mime: string,
  folder = "photo-studio-os"
): Promise<{ url: string; publicId: string }> {
  // Dynamic import keeps the cloudinary package out of the client bundle
  const cloudinary = (await import("cloudinary")).v2;

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "image",
        format: mime === "image/gif" ? "gif" : undefined,
        transformation: [{ quality: "auto", fetch_format: "auto" }],
      },
      (error, result) => {
        if (error || !result) return reject(error ?? new Error("Cloudinary upload failed"));
        resolve({ url: result.secure_url, publicId: result.public_id });
      }
    );
    stream.end(buffer);
  });
}

// ---------------------------------------------------------------------------
// Local filesystem fallback (development without Cloudinary)
// ---------------------------------------------------------------------------
async function saveLocally(buffer: Buffer, originalName: string): Promise<string> {
  const publicUploadsDir = path.join(process.cwd(), "public", "uploads");
  if (!fs.existsSync(publicUploadsDir)) {
    fs.mkdirSync(publicUploadsDir, { recursive: true });
  }
  const ext = path.extname(originalName) || ".jpg";
  const fileName = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`;
  fs.writeFileSync(path.join(publicUploadsDir, fileName), buffer);
  return `/uploads/${fileName}`;
}

// ---------------------------------------------------------------------------
// POST /api/upload
// ---------------------------------------------------------------------------
export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const folder = (formData.get("folder") as string) || "photo-studio-os";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // 1. Size check
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: `File exceeds the 10 MB limit (received ${(file.size / 1024 / 1024).toFixed(1)} MB)` },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // 2. Magic-byte validation (server-side, not trusting browser MIME)
    const detectedMime = detectMimeByMagic(buffer);
    if (!detectedMime || !ALLOWED_MIMES.has(detectedMime)) {
      return NextResponse.json(
        { error: "Invalid file type. Only JPEG, PNG, WebP, and GIF images are allowed." },
        { status: 415 }
      );
    }

    // 3. Upload to Cloudinary if configured, otherwise local filesystem
    const cloudinaryConfigured =
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET &&
      process.env.CLOUDINARY_CLOUD_NAME !== "your_cloud_name";

    if (cloudinaryConfigured) {
      const { url, publicId } = await uploadToCloudinary(buffer, detectedMime, folder);
      return NextResponse.json({ url, publicId, success: true, storage: "cloudinary" });
    }

    // Local fallback
    try {
      const url = await saveLocally(buffer, file.name);
      return NextResponse.json({ url, success: true, storage: "local" });
    } catch {
      return NextResponse.json(
        {
          error:
            "Cloudinary is not configured and the local filesystem is not writable. " +
            "Add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET to your .env.local file.",
        },
        { status: 500 }
      );
    }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Upload failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
