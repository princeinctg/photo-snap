import { NextResponse } from "next/server";
import { recordInvoicePayment } from "@/lib/db";
import { DEFAULT_STUDIO_ID } from "@/lib/demo-data";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();

    if (!body.amount || Number(body.amount) <= 0) {
      return NextResponse.json({ error: "Valid payment amount is required" }, { status: 400 });
    }

    const result = await recordInvoicePayment({
      studioId: body.studioId || DEFAULT_STUDIO_ID,
      invoiceId: params.id,
      amount: Number(body.amount),
      paymentDate: body.paymentDate || new Date().toISOString().split("T")[0],
      paymentMethod: body.paymentMethod || "cash",
      referenceNumber: body.referenceNumber,
      notes: body.notes,
    });

    return NextResponse.json({
      success: true,
      payment: result.payment,
      invoice: result.invoice,
      income: result.income,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to record payment" }, { status: 500 });
  }
}
