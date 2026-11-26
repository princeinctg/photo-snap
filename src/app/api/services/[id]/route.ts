import { NextResponse } from "next/server";
import { ApiError, audit, handleError, parseBody, requireStaff } from "@/lib/api";
import { ServiceModel } from "@/lib/models";
import { serviceUpdateSchema } from "@/lib/validation";

async function findService(id: string, studioId: string) {
  const service = await ServiceModel.findOne({ id, studioId }).lean();
  if (!service) throw new ApiError(404, "Service not found", "NOT_FOUND");
  return service as any;
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireStaff(req, "services:read");
    const service = await findService(params.id, auth.studioId);
    return NextResponse.json({ success: true, service: { ...service, id: service.id || String(service._id) } });
  } catch (error) {
    return handleError(error);
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireStaff(req, "services:write");
    const existing = await findService(params.id, auth.studioId);
    const body = await parseBody(req, serviceUpdateSchema);

    const updated = await ServiceModel.findOneAndUpdate(
      { id: params.id, studioId: auth.studioId },
      { $set: body },
      { new: true }
    ).lean();

    await audit({
      req,
      auth,
      studioId: auth.studioId,
      action: "service.update",
      entityType: "Service",
      entityId: params.id,
      details: { fields: Object.keys(body), name: existing.name },
    });

    return NextResponse.json({ success: true, service: { ...(updated as any), id: existing.id } });
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireStaff(req, "services:write");
    const existing = await findService(params.id, auth.studioId);
    await ServiceModel.updateOne(
      { id: params.id, studioId: auth.studioId },
      { $set: { isActive: false } }
    );
    await audit({
      req,
      auth,
      studioId: auth.studioId,
      action: "service.deactivate",
      entityType: "Service",
      entityId: params.id,
      details: { name: existing.name },
    });
    return NextResponse.json({ success: true, message: "Service deactivated." });
  } catch (error) {
    return handleError(error);
  }
}
