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
} from "@/lib/api";
import { can } from "@/lib/permissions";
import { ClientModel, EmployeeModel, ProjectModel } from "@/lib/models";
import { projectCreateSchema } from "@/lib/validation";

async function resolveRefs(ids: string[], studioId: string) {
  if (!ids.length) return [];
  const docs = await EmployeeModel.find({ studioId, id: { $in: ids } })
    .select("_id")
    .lean();
  return docs.map((doc: any) => doc._id);
}

function serialize(project: any) {
  const assigned = Array.isArray(project.assignedEmployees) ? project.assignedEmployees : [];
  return {
    ...project,
    id: project.id || String(project._id),
    assignedEmployeeNames: assigned
      .filter((employee: any) => employee && typeof employee === "object")
      .map((employee: any) => employee.fullName),
    assignedEmployees: assigned.map((employee: any) =>
      employee && typeof employee === "object" ? employee.id || String(employee._id) : String(employee)
    ),
  };
}

export async function GET(req: Request) {
  try {
    const auth = await requireAuth(req);
    const options = getPagination(req, { limit: 200, sortBy: "createdAt" });
    const { searchParams } = new URL(req.url);
    const filter: Record<string, unknown> = { studioId: auth.studioId };

    if (auth.role === "client") {
      const clients = await ClientModel.find({ studioId: auth.studioId, userId: auth.userId })
        .select("id")
        .lean();
      filter.clientId = { $in: clients.map((client: any) => client.id) };
    } else if (auth.role === "employee") {
      const employee = await EmployeeModel.findOne({
        studioId: auth.studioId,
        userId: auth.userId,
      })
        .select("_id")
        .lean<any>();
      filter.assignedEmployees = employee?._id || new mongoose.Types.ObjectId();
    } else if (!can(auth.role, "projects:read")) {
      throw new ApiError(403, "You do not have permission to view projects.", "FORBIDDEN");
    }

    const status = searchParams.get("status");
    if (status) filter.status = status;
    const clientId = searchParams.get("clientId");
    if (clientId) filter.clientId = clientId;

    if (options.search) {
      const rx = new RegExp(escapeRegex(options.search), "i");
      filter.$or = [{ title: rx }, { projectId: rx }, { description: rx }, { clientName: rx }];
    }

    const sortField = ["createdAt", "startDate", "title", "status"].includes(options.sortBy)
      ? options.sortBy
      : "createdAt";

    const [total, docs] = await Promise.all([
      ProjectModel.countDocuments(filter),
      ProjectModel.find(filter)
        .populate("assignedEmployees", "fullName employeeId profilePhoto")
        .populate("client", "name phone email")
        .sort({ [sortField]: options.sortOrder })
        .skip(options.skip)
        .limit(options.limit)
        .lean(),
    ]);

    const projects = docs.map(serialize);
    return NextResponse.json({
      success: true,
      projects,
      data: projects,
      pagination: paginationMeta(total, options),
    });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireStaff(req, "projects:write");
    const body = await parseBody(req, projectCreateSchema);

    let client = null;
    let clientName = "";
    if (body.clientId) {
      const clientDoc = await ClientModel.findOne({
        id: body.clientId,
        studioId: auth.studioId,
      })
        .select("_id name")
        .lean<any>();
      if (!clientDoc) throw new ApiError(400, "Selected client was not found.", "INVALID_CLIENT");
      client = clientDoc._id;
      clientName = (clientDoc as any).name;
    }

    const count = await ProjectModel.countDocuments({ studioId: auth.studioId });
    const projectId =
      body.projectId?.trim() || `PRJ-${new Date().getFullYear()}-${String(count + 1).padStart(3, "0")}`;

    const created = await ProjectModel.create({
      ...body,
      projectId,
      id: `prj_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      studioId: auth.studioId,
      client,
      clientName,
      assignedEmployees: await resolveRefs(body.assignedEmployees || [], auth.studioId),
      createdBy: auth.userObjectId,
    });

    await audit({
      req,
      auth,
      studioId: auth.studioId,
      action: "project.create",
      entityType: "Project",
      entityId: created.id,
      details: { title: body.title, projectId },
    });

    return NextResponse.json(
      { success: true, project: serialize(created.toObject()) },
      { status: 201 }
    );
  } catch (error) {
    return handleError(error);
  }
}
