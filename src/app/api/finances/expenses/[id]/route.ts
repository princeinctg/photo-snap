import { NextResponse } from "next/server";
import { deleteExpense, saveExpense } from "@/lib/db";

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const updated = await saveExpense({ ...body, id: params.id });
    return NextResponse.json({ expense: updated, success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to update expense" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const success = await deleteExpense(params.id);
    return NextResponse.json({ success });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to delete expense" }, { status: 500 });
  }
}
