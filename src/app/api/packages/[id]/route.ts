import { NextResponse } from "next/server";
import { deletePackage, savePackage } from "@/lib/db";
import { getAuthStudioId } from "@/lib/auth";

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const studioId = getAuthStudioId(req);
    const body = await req.json();
    const updated = await savePackage({ ...body, id: params.id, studioId });
    return NextResponse.json({ package: updated, success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to update package" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const studioId = getAuthStudioId(req);
    const success = await deletePackage(params.id, studioId);
    return NextResponse.json({ success });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to delete package" }, { status: 500 });
  }
}
