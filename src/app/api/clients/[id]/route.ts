import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { ApiError, audit, handleError, parseBody, requireAuth, requireStaff } from "@/lib/api";
import { can } from "@/lib/permissions";
import { ClientModel, UserModel } from "@/lib/models";
import { getBookings, getInvoices, getPayments } from "@/lib/db";
import { clientUpdateSchema } from "@/lib/validation";

async function findClient(id: string, studioId: string) {
  const client = await ClientModel.findOne({ id, studioId }).lean();
  if (!client) throw new ApiError(404, "Client not found", "NOT_FOUND");
  return client as any;
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuth(req);
    if (auth.role !== "client" && !can(auth.role, "clients:read")) {
      throw new ApiError(403, "You do not have permission to view clients.", "FORBIDDEN");
    }

    const client = await findClient(params.id, auth.studioId);
    if (auth.role === "client" && client.userId !== auth.userId) {
      throw new ApiError(403, "You can only access your own records.", "FORBIDDEN");
    }

    const [bookings, invoices, payments] = await Promise.all([
      getBookings(auth.studioId),
      getInvoices(auth.studioId),
      getPayments(auth.studioId),
    ]);

    return NextResponse.json({
      success: true,
      client: { ...client, id: client.id || String(client._id) },
      bookings: bookings.filter((b) => b.clientId === client.id),
      invoices: invoices.filter((i) => i.clientId === client.id),
      payments: payments.filter((p) => p.clientId === client.id),
    });
  } catch (error) {
    return handleError(error);
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireStaff(req, "clients:write");
    const body = await parseBody(req, clientUpdateSchema);
    const existing = await findClient(params.id, auth.studioId);

    const update: Record<string, unknown> = { ...body };
    if (body.userId !== undefined) {
      const user = body.userId
        ? await UserModel.findOne({ id: body.userId, studioId: auth.studioId }).select("_id").lean<any>()
        : null;
      update.user = (user?._id as mongoose.Types.ObjectId) || null;
    }

    const updated = await ClientModel.findOneAndUpdate(
      { id: params.id, studioId: auth.studioId },
      { $set: update },
      { new: true }
    ).lean();

    await audit({
      req,
      auth,
      studioId: auth.studioId,
      action: "client.update",
      entityType: "Client",
      entityId: params.id,
      details: { fields: Object.keys(body) },
    });

    return NextResponse.json({
      success: true,
      client: { ...(updated as any), id: existing.id },
    });
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireStaff(req, "clients:write");
    const existing = await findClient(params.id, auth.studioId);

    // Soft delete keeps bookings, invoices and payment history intact.
    await ClientModel.updateOne(
      { id: params.id, studioId: auth.studioId },
      { $set: { isArchived: true, status: "inactive" } }
    );

    await audit({
      req,
      auth,
      studioId: auth.studioId,
      action: "client.archive",
      entityType: "Client",
      entityId: params.id,
      details: { name: existing.name },
    });

    return NextResponse.json({ success: true, message: "Client archived." });
  } catch (error) {
    return handleError(error);
  }
}
