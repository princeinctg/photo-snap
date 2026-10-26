import { NextResponse } from "next/server";
import { deletePackage, savePackage } from "@/lib/db";

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const updated = await savePackage({ ...body, id: params.id });
    return NextResponse.json({ package: updated, success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to update package" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const success = await deletePackage(params.id);
    return NextResponse.json({ success });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to delete package" }, { status: 500 });
  }
}
