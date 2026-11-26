import { NextResponse } from "next/server";
import {
  ApiError,
  audit,
  escapeRegex,
  getPagination,
  handleError,
  paginationMeta,
  parseBody,
  requireStaff,
  toLeanList,
} from "@/lib/api";
import { can } from "@/lib/permissions";
import { requireAuth } from "@/lib/api";
import { ServiceModel } from "@/lib/models";
import { serviceCreateSchema } from "@/lib/validation";

export async function GET(req: Request) {
  try {
    const auth = await requireAuth(req);
    if (!can(auth.role, "services:read")) {
      throw new ApiError(403, "You do not have permission to view services.", "FORBIDDEN");
    }
    const options = getPagination(req, { limit: 200, sortBy: "createdAt" });
    const { searchParams } = new URL(req.url);
    const filter: Record<string, unknown> = { studioId: auth.studioId };

    const category = searchParams.get("category");
    if (category) filter.category = category;
    const active = searchParams.get("isActive");
    if (active !== null && active !== "") filter.isActive = active === "true";

    if (options.search) {
      const rx = new RegExp(escapeRegex(options.search), "i");
      filter.$or = [{ name: rx }, { serviceId: rx }, { description: rx }, { category: rx }];
    }

    const sortField = ["createdAt", "name", "price"].includes(options.sortBy)
      ? options.sortBy
      : "createdAt";

    const [total, docs] = await Promise.all([
      ServiceModel.countDocuments(filter),
      ServiceModel.find(filter)
        .sort({ [sortField]: options.sortOrder })
        .skip(options.skip)
        .limit(options.limit)
        .lean(),
    ]);

    const services = toLeanList(docs);
    return NextResponse.json({
      success: true,
      services,
      data: services,
      pagination: paginationMeta(total, options),
    });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireStaff(req, "services:write");
    const body = await parseBody(req, serviceCreateSchema);
    const count = await ServiceModel.countDocuments({ studioId: auth.studioId });
    const serviceId = body.serviceId?.trim() || `SRV-${String(count + 1).padStart(4, "0")}`;

    const created = await ServiceModel.create({
      ...body,
      serviceId,
      id: `srv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      studioId: auth.studioId,
      createdBy: auth.userObjectId,
    });

    await audit({
      req,
      auth,
      studioId: auth.studioId,
      action: "service.create",
      entityType: "Service",
      entityId: created.id,
      details: { name: body.name, serviceId },
    });

    return NextResponse.json(
      { success: true, service: { ...created.toObject(), id: created.id } },
      { status: 201 }
    );
  } catch (error) {
    return handleError(error);
  }
}
