import { NextResponse } from "next/server";
import mongoose from "mongoose";
import {
  ApiError,
  audit,
  escapeRegex,
  getPagination,
  handleError,
  paginationMeta,
  parseBody,
  requireAuth,
  requireStaff,
  toLeanList,
} from "@/lib/api";
import { can } from "@/lib/permissions";
import { ClientModel, UserModel } from "@/lib/models";
import { clientCreateSchema } from "@/lib/validation";

function buildFilter(req: Request, studioId: string, ownUserId?: string) {
  const { search } = getPagination(req);
  const { searchParams } = new URL(req.url);
  const filter: Record<string, unknown> = {
    studioId,
    isArchived: { $ne: true },
  };

  if (ownUserId) filter.userId = ownUserId;

  const status = searchParams.get("status");
  if (status) filter.status = status;

  const balance = searchParams.get("balance");
  if (balance === "outstanding") filter.balance = { $gt: 0 };
  if (balance === "settled") filter.balance = 0;

  if (search) {
    const rx = new RegExp(escapeRegex(search), "i");
    filter.$or = [{ name: rx }, { phone: rx }, { email: rx }, { address: rx }, { clientCode: rx }];
  }

  return filter;
}

export async function GET(req: Request) {
  try {
    const auth = await requireAuth(req);
    if (auth.role !== "client" && !can(auth.role, "clients:read")) {
      throw new ApiError(403, "You do not have permission to view clients.", "FORBIDDEN");
    }

    const options = getPagination(req, { limit: 200, sortBy: "createdAt" });
    const filter = buildFilter(req, auth.studioId, auth.role === "client" ? auth.userId : undefined);
    const sortField = ["createdAt", "name", "balance", "totalPaid", "updatedAt"].includes(options.sortBy)
      ? options.sortBy
      : "createdAt";

    const [total, docs] = await Promise.all([
      ClientModel.countDocuments(filter),
      ClientModel.find(filter)
        .sort({ [sortField]: options.sortOrder })
        .skip(options.skip)
        .limit(options.limit)
        .lean(),
    ]);

    const clients = toLeanList(docs);
    return NextResponse.json({
      success: true,
      clients,
      data: clients,
      pagination: paginationMeta(total, options),
    });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireStaff(req, "clients:write");
    const body = await parseBody(req, clientCreateSchema);

    const clientId = `cli_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const count = await ClientModel.countDocuments({ studioId: auth.studioId });

    let userRef: mongoose.Types.ObjectId | null = null;
    if (body.userId) {
      const user = await UserModel.findOne({ id: body.userId, studioId: auth.studioId })
        .select("_id")
        .lean<any>();
      userRef = (user?._id as mongoose.Types.ObjectId) || null;
    }

    const created = await ClientModel.create({
      ...body,
      id: clientId,
      clientCode: `CL-${String(count + 1).padStart(4, "0")}`,
      studioId: auth.studioId,
      user: userRef,
      createdBy: auth.userObjectId,
      totalBilled: 0,
      totalPaid: 0,
      totalSpending: 0,
      balance: 0,
    });

    await audit({
      req,
      auth,
      studioId: auth.studioId,
      action: "client.create",
      entityType: "Client",
      entityId: clientId,
      details: { name: body.name },
    });

    return NextResponse.json(
      { success: true, client: { ...created.toObject(), id: clientId } },
      { status: 201 }
    );
  } catch (error) {
    return handleError(error);
  }
}
