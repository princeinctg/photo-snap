import { NextResponse } from "next/server";
import { resetAndSeedData, connectMongo } from "@/lib/db";
import { getAuthStudioId } from "@/lib/auth";
import fs from "fs";
import path from "path";
import { initialSettings } from "@/lib/demo-data";
import {
  ClientModel,
  BookingModel,
  InvoiceModel,
  PaymentModel,
  IncomeModel,
  ExpenseModel,
  PackageModel,
  GalleryModel,
} from "@/lib/models";

const DATA_DIR = path.join(process.cwd(), ".data");
const STORE_FILE = path.join(DATA_DIR, "studio-store.json");

export async function POST(req: Request) {
  try {
    const studioId = getAuthStudioId(req);
    const { action } = await req.json().catch(() => ({ action: "seed" }));

    if (action === "clear") {
      const connected = await connectMongo();
      if (connected) {
        await Promise.all([
          ClientModel.deleteMany({ studioId }),
          BookingModel.deleteMany({ studioId }),
          InvoiceModel.deleteMany({ studioId }),
          PaymentModel.deleteMany({ studioId }),
          IncomeModel.deleteMany({ studioId }),
          ExpenseModel.deleteMany({ studioId }),
          PackageModel.deleteMany({ studioId }),
          GalleryModel.deleteMany({ studioId }),
        ]);
      }

      if (fs.existsSync(STORE_FILE)) {
        try {
          const raw = fs.readFileSync(STORE_FILE, "utf-8");
          const store = JSON.parse(raw);
          store.clients = (store.clients || []).filter((c: any) => c.studioId !== studioId);
          store.bookings = (store.bookings || []).filter((b: any) => b.studioId !== studioId);
          store.invoices = (store.invoices || []).filter((i: any) => i.studioId !== studioId);
          store.payments = (store.payments || []).filter((p: any) => p.studioId !== studioId);
          store.incomes = (store.incomes || []).filter((inc: any) => inc.studioId !== studioId);
          store.expenses = (store.expenses || []).filter((e: any) => e.studioId !== studioId);
          store.packages = (store.packages || []).filter((p: any) => p.studioId !== studioId);
          store.galleries = (store.galleries || []).filter((g: any) => g.studioId !== studioId);
          fs.writeFileSync(STORE_FILE, JSON.stringify(store, null, 2), "utf-8");
        } catch {}
      }

      return NextResponse.json({
        success: true,
        message: "Studio data cleared successfully. Fresh empty workspace ready.",
      });
    }

    // Default: Seed realistic demo data for this studio
    const data = await resetAndSeedData(studioId);
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
