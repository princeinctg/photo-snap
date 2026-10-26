import { NextResponse } from "next/server";
import { resetAndSeedData } from "@/lib/db";
import fs from "fs";
import path from "path";
import { initialSettings } from "@/lib/demo-data";

const DATA_DIR = path.join(process.cwd(), ".data");
const STORE_FILE = path.join(DATA_DIR, "studio-store.json");

export async function POST(req: Request) {
  try {
    const { action } = await req.json().catch(() => ({ action: "seed" }));

    if (action === "clear") {
      // Clear all demo data leaving clean empty database
      const emptyStore = {
        clients: [],
        bookings: [],
        invoices: [],
        payments: [],
        incomes: [],
        expenses: [],
        packages: [],
        galleries: [],
        settings: initialSettings,
      };
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(STORE_FILE, JSON.stringify(emptyStore, null, 2), "utf-8");
      return NextResponse.json({ success: true, message: "All demo data removed successfully. Fresh empty studio ready." });
    }

    // Default: Reset and seed realistic PhotoSnap BD style demo data
    const data = await resetAndSeedData();
    return NextResponse.json({
      success: true,
      message: "Realistic demo data seeded successfully",
      clientsCount: data.clients.length,
      bookingsCount: data.bookings.length,
      invoicesCount: data.invoices.length,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to seed data" }, { status: 500 });
  }
}
