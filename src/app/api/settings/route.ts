import { NextResponse } from "next/server";
import { getSettings, saveSettings } from "@/lib/db";
import { DEFAULT_STUDIO_ID } from "@/lib/demo-data";
import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), ".data");
const STORE_FILE = path.join(DATA_DIR, "studio-store.json");

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const studioId = searchParams.get("studioId") || DEFAULT_STUDIO_ID;
    const settings = await getSettings(studioId);
    return NextResponse.json({ settings });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to load settings" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const updated = await saveSettings(body);
    return NextResponse.json({ settings: updated, success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to save settings" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { action, backupData } = await req.json();

    if (action === "export") {
      if (fs.existsSync(STORE_FILE)) {
        const raw = fs.readFileSync(STORE_FILE, "utf-8");
        return NextResponse.json({ backup: JSON.parse(raw) });
      }
      return NextResponse.json({ error: "Store not initialized" }, { status: 400 });
    }

    if (action === "import" && backupData) {
      fs.writeFileSync(STORE_FILE, JSON.stringify(backupData, null, 2), "utf-8");
      return NextResponse.json({ success: true, message: "Backup successfully restored" });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Backup operation failed" }, { status: 500 });
  }
}
