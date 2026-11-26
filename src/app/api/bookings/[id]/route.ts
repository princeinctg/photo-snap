import { NextResponse } from "next/server";
import { ApiError, audit, handleError, parseBody, requireAuth, requireStaff } from "@/lib/api";
import { can } from "@/lib/permissions";
import { getBookings, saveBooking, deleteBooking } from "@/lib/db";
import { ClientModel, EmployeeModel } from "@/lib/models";
import { bookingUpdateSchema } from "@/lib/validation";

async function findBooking(auth: Awaited<ReturnType<typeof requireAuth>>, id: string) {
  const bookings = await getBookings(auth.studioId);
  const booking = bookings.find((item) => item.id === id);
  if (!booking) throw new ApiError(404, "Booking not found", "NOT_FOUND");

  if (auth.role === "client") {
    const client = await ClientModel.findOne({ id: booking.clientId, studioId: auth.studioId })
      .select("userId")
      .lean();
    if (!client || (client as any).userId !== auth.userId) {
      throw new ApiError(403, "You can only access your own bookings.", "FORBIDDEN");
    }
  } else if (auth.role === "employee") {
    const employee = await EmployeeModel.findOne({ studioId: auth.studioId, userId: auth.userId })
      .select("_id")
      .lean<{ _id: unknown } | null>();
    const employeeId = employee ? String(employee._id) : "";
    if (!(booking.assignedEmployees || []).some((assigned) => String(assigned) === employeeId)) {
      throw new ApiError(403, "You can only access bookings assigned to you.", "FORBIDDEN");
    }
  } else if (!can(auth.role, "bookings:read")) {
    throw new ApiError(403, "You do not have permission to view this booking.", "FORBIDDEN");
  }

  return booking;
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuth(req);
    const booking = await findBooking(auth, params.id);
    return NextResponse.json({ success: true, booking });
  } catch (error) {
    return handleError(error);
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireStaff(req, "bookings:write");
    const existing = await findBooking(auth, params.id);
    const body = await parseBody(req, bookingUpdateSchema);

    if (body.clientId) {
      const client = await ClientModel.findOne({ id: body.clientId, studioId: auth.studioId }).lean();
      if (!client) throw new ApiError(400, "Selected client was not found.", "INVALID_CLIENT");
    }

    const updated = await saveBooking({
      ...body,
      eventType: (body.eventType || existing.eventType) as any,
      id: params.id,
      studioId: auth.studioId,
      title: body.title || existing.title,
      shootDate: body.shootDate || existing.shootDate,
      clientId: body.clientId || existing.clientId,
    });

    await audit({
      req,
      auth,
      studioId: auth.studioId,
      action: "booking.update",
      entityType: "Booking",
      entityId: params.id,
      details: { fields: Object.keys(body) },
    });

    return NextResponse.json({ success: true, booking: updated });
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireStaff(req, "bookings:write");
    const existing = await findBooking(auth, params.id);
    await deleteBooking(params.id, auth.studioId);
    await audit({
      req,
      auth,
      studioId: auth.studioId,
      action: "booking.delete",
      entityType: "Booking",
      entityId: params.id,
      details: { title: existing.title },
    });
    return NextResponse.json({ success: true, message: "Booking deleted." });
  } catch (error) {
    return handleError(error);
  }
}
