import { NextResponse } from "next/server";
import { deleteIncome, saveIncome } from "@/lib/db";
import { getAuthStudioId } from "@/lib/auth";

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const studioId = getAuthStudioId(req);
    const body = await req.json();
    const updated = await saveIncome({ ...body, id: params.id, studioId });
    return NextResponse.json({ income: updated, success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to update income" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const studioId = getAuthStudioId(req);
    const success = await deleteIncome(params.id, studioId);
    return NextResponse.json({ success });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to delete income" }, { status: 500 });
  }
}
