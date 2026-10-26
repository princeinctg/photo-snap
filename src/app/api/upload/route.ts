import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const base64Data = formData.get("base64") as string | null;

    // Handle base64 direct image
    if (base64Data) {
      return NextResponse.json({ url: base64Data, success: true });
    }

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Limit check: 10MB
    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "File exceeds 10MB limit" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Save to public/uploads directory if writable (standard Node/Next)
    try {
      const publicUploadsDir = path.join(process.cwd(), "public", "uploads");
      if (!fs.existsSync(publicUploadsDir)) {
        fs.mkdirSync(publicUploadsDir, { recursive: true });
      }

      const fileExt = path.extname(file.name) || ".jpg";
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}${fileExt}`;
      const filePath = path.join(publicUploadsDir, fileName);

      fs.writeFileSync(filePath, buffer);
      return NextResponse.json({ url: `/uploads/${fileName}`, success: true });
    } catch {
      // In serverless readonly environments (like Vercel ephemeral lambdas), return optimized Data URI
      const mimeType = file.type || "image/jpeg";
      const base64Str = `data:${mimeType};base64,${buffer.toString("base64")}`;
      return NextResponse.json({ url: base64Str, success: true });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to upload image" }, { status: 500 });
  }
}
