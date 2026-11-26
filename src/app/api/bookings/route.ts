import { NextResponse } from "next/server";
import { ApiError, audit, handleError, parseBody, requireAuth, requireStaff } from "@/lib/api";
import { can } from "@/lib/permissions";
import { getBookings, saveBooking } from "@/lib/db";
import { ClientModel, EmployeeModel } from "@/lib/models";
import { bookingCreateSchema } from "@/lib/validation";

async function scopeBookings(auth: Awaited<ReturnType<typeof requireAuth>>) {
  let bookings = await getBookings(auth.studioId);

  if (auth.role === "client") {
    const clients = await ClientModel.find({ studioId: auth.studioId, userId: auth.userId })
      .select("id")
      .lean();
    const ids = clients.map((client: any) => client.id);
    bookings = bookings.filter((booking) => ids.includes(booking.clientId));
  } else if (auth.role === "employee") {
    const employee = await EmployeeModel.findOne({
      studioId: auth.studioId,
      userId: auth.userId,
    })
      .select("_id")
      .lean<{ _id: unknown } | null>();
    const employeeId = employee ? String(employee._id) : "";
    bookings = bookings.filter((booking) =>
      (booking.assignedEmployees || []).some((id) => String(id) === employeeId)
    );
  } else if (!can(auth.role, "bookings:read")) {
    throw new ApiError(403, "You do not have permission to view bookings.", "FORBIDDEN");
  }

  return bookings;
}

export async function GET(req: Request) {
  try {
    const auth = await requireAuth(req);
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const date = searchParams.get("date");
    const clientId = searchParams.get("clientId");
    const q = (searchParams.get("q") || "").toLowerCase().trim();

    let bookings = await scopeBookings(auth);

    if (status) bookings = bookings.filter((booking) => booking.status === status);
    if (date) bookings = bookings.filter((booking) => booking.shootDate === date);
    if (clientId) bookings = bookings.filter((booking) => booking.clientId === clientId);
    if (q) {
      bookings = bookings.filter(
        (booking) =>
          booking.title.toLowerCase().includes(q) ||
          (booking.clientName || "").toLowerCase().includes(q) ||
          (booking.venue || "").toLowerCase().includes(q)
      );
    }

    return NextResponse.json({ success: true, bookings, data: bookings });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireStaff(req, "bookings:write");
    const body = await parseBody(req, bookingCreateSchema);

    const client = await ClientModel.findOne({ id: body.clientId, studioId: auth.studioId }).lean();
    if (!client) throw new ApiError(400, "Selected client was not found.", "INVALID_CLIENT");

    const existingBookings = await getBookings(auth.studioId);
    const conflict = existingBookings.find(
      (booking) =>
        booking.shootDate === body.shootDate &&
        booking.status !== "cancelled" &&
        ((body.assignedPhotographer &&
          booking.assignedPhotographer &&
          booking.assignedPhotographer === body.assignedPhotographer) ||
          (body.venue &&
            booking.venue &&
            booking.venue.toLowerCase() === body.venue.toLowerCase() &&
            booking.venue.toLowerCase() !== "studio"))
    );

    const saved = await saveBooking({
      ...body,
      eventType: body.eventType as any,
      studioId: auth.studioId,
      clientName: (client as any).name,
      clientPhone: (client as any).phone,
      clientEmail: (client as any).email,
    });

    await audit({
      req,
      auth,
      studioId: auth.studioId,
      action: "booking.create",
      entityType: "Booking",
      entityId: saved.id,
      details: { title: saved.title, shootDate: saved.shootDate },
    });

    return NextResponse.json(
      {
        success: true,
        booking: saved,
        conflictDetected: Boolean(conflict),
        conflictWith: conflict ? conflict.title : null,
      },
      { status: 201 }
    );
  } catch (error) {
    return handleError(error);
  }
}
