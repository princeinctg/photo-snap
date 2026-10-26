import { NextResponse } from "next/server";
import { getBookings, saveBooking, deleteBooking } from "@/lib/db";
import { DEFAULT_STUDIO_ID } from "@/lib/demo-data";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const bookings = await getBookings(DEFAULT_STUDIO_ID);
    const booking = bookings.find((b) => b.id === params.id);
    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }
    return NextResponse.json({ booking });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to load booking" }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const updated = await saveBooking({ ...body, id: params.id });
    return NextResponse.json({ booking: updated, success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to update booking" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const success = await deleteBooking(params.id);
    return NextResponse.json({ success });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to delete booking" }, { status: 500 });
  }
}
