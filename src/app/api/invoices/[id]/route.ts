import { NextResponse } from "next/server";
import { getInvoices, saveInvoice, deleteInvoice, getPayments } from "@/lib/db";
import { DEFAULT_STUDIO_ID } from "@/lib/demo-data";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const invoices = await getInvoices(DEFAULT_STUDIO_ID);
    const invoice = invoices.find((i) => i.id === params.id || i.shareToken === params.id);
    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const payments = (await getPayments(DEFAULT_STUDIO_ID)).filter((p) => p.invoiceId === invoice.id);

    return NextResponse.json({ invoice, payments });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to load invoice" }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const updated = await saveInvoice({ ...body, id: params.id });
    return NextResponse.json({ invoice: updated, success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to update invoice" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const success = await deleteInvoice(params.id);
    return NextResponse.json({ success });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to delete invoice" }, { status: 500 });
  }
}
