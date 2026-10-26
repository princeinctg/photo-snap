import { NextResponse } from "next/server";
import { getBookings, saveBooking } from "@/lib/db";
import { DEFAULT_STUDIO_ID } from "@/lib/demo-data";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const studioId = searchParams.get("studioId") || DEFAULT_STUDIO_ID;
    const status = searchParams.get("status");
    const date = searchParams.get("date");
    const month = searchParams.get("month"); // e.g. "2024-11"

    let bookings = await getBookings(studioId);

    if (status) {
      bookings = bookings.filter((b) => b.status === status);
    }
    if (date) {
      bookings = bookings.filter((b) => b.shootDate === date);
    }
    if (month) {
      bookings = bookings.filter((b) => b.shootDate.startsWith(month));
    }

    return NextResponse.json({ bookings });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to load bookings" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (!body.title || !body.clientId || !body.shootDate) {
      return NextResponse.json(
        { error: "Title, Client, and Shoot Date are required" },
        { status: 400 }
      );
    }

    // Check for scheduling conflicts on the same date & time
    const existing = await getBookings(body.studioId || DEFAULT_STUDIO_ID);
    const conflicts = existing.filter(
      (b) =>
        b.shootDate === body.shootDate &&
        b.status !== "cancelled" &&
        b.id !== body.id &&
        (b.assignedPhotographer && body.assignedPhotographer && b.assignedPhotographer === body.assignedPhotographer)
    );

    const saved = await saveBooking(body);
    return NextResponse.json(
      {
        booking: saved,
        hasConflict: conflicts.length > 0,
        conflictDetails: conflicts.length > 0 ? conflicts : undefined,
        success: true,
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to save booking" }, { status: 500 });
  }
}
