import { NextResponse } from "next/server";
import { getInvoices, saveInvoice } from "@/lib/db";
import { DEFAULT_STUDIO_ID } from "@/lib/demo-data";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const studioId = searchParams.get("studioId") || DEFAULT_STUDIO_ID;
    const status = searchParams.get("status");
    const clientId = searchParams.get("clientId");
    const query = (searchParams.get("q") || "").toLowerCase().trim();

    let invoices = await getInvoices(studioId);

    if (status && status !== "all") {
      invoices = invoices.filter((inv) => inv.status === status);
    }
    if (clientId) {
      invoices = invoices.filter((inv) => inv.clientId === clientId);
    }
    if (query) {
      invoices = invoices.filter(
        (inv) =>
          inv.invoiceNumber.toLowerCase().includes(query) ||
          inv.clientName.toLowerCase().includes(query) ||
          (inv.bookingTitle && inv.bookingTitle.toLowerCase().includes(query))
      );
    }

    return NextResponse.json({ invoices });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to load invoices" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body.clientId || !body.items || body.items.length === 0) {
      return NextResponse.json(
        { error: "Client and at least one line item are required" },
        { status: 400 }
      );
    }

    const saved = await saveInvoice(body);
    return NextResponse.json({ invoice: saved, success: true }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to save invoice" }, { status: 500 });
  }
}
