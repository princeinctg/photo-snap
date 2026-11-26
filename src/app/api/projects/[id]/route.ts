import { NextResponse } from "next/server";
import { ApiError, audit, handleError, parseBody, requireAuth, requireStaff } from "@/lib/api";
import { can } from "@/lib/permissions";
import { ClientModel, EmployeeModel, ProjectModel } from "@/lib/models";
import { projectUpdateSchema } from "@/lib/validation";

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

async function findProject(id: string, studioId: string) {
  const project = await ProjectModel.findOne({ id, studioId })
    .populate("assignedEmployees", "fullName employeeId profilePhoto")
    .populate("client", "name phone email")
    .lean();
  if (!project) throw new ApiError(404, "Project not found", "NOT_FOUND");
  return project as any;
}

async function assertProjectAccess(auth: Awaited<ReturnType<typeof requireAuth>>, project: any) {
  if (auth.role === "client") {
    const clients = await ClientModel.find({ studioId: auth.studioId, userId: auth.userId })
      .select("id")
      .lean();
    const ids = clients.map((client: any) => client.id);
    if (!ids.includes(project.clientId)) {
      throw new ApiError(403, "You can only access your own projects.", "FORBIDDEN");
    }
    return;
  }
  if (auth.role === "employee") {
    const employee = await EmployeeModel.findOne({ studioId: auth.studioId, userId: auth.userId })
      .select("_id")
      .lean<any>();
    const assigned = (project.assignedEmployees || []).map((item: any) =>
      typeof item === "object" ? String(item._id) : String(item)
    );
    if (!employee || !assigned.includes(String(employee._id))) {
      throw new ApiError(403, "You can only access projects assigned to you.", "FORBIDDEN");
    }
    return;
  }
  if (!can(auth.role, "projects:read")) {
    throw new ApiError(403, "You do not have permission to view this project.", "FORBIDDEN");
  }
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuth(req);
    const project = await findProject(params.id, auth.studioId);
    await assertProjectAccess(auth, project);
    return NextResponse.json({ success: true, project: serialize(project) });
  } catch (error) {
    return handleError(error);
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireStaff(req, "projects:write");
    const existing = await findProject(params.id, auth.studioId);
    const body = await parseBody(req, projectUpdateSchema);

    const update: Record<string, unknown> = { ...body };

    if (body.clientId !== undefined) {
      if (body.clientId) {
        const client = await ClientModel.findOne({ id: body.clientId, studioId: auth.studioId })
          .select("_id name")
          .lean<any>();
        if (!client) throw new ApiError(400, "Selected client was not found.", "INVALID_CLIENT");
        update.client = client._id;
        update.clientName = (client as any).name;
      } else {
        update.client = null;
        update.clientName = "";
      }
    }

    if (body.assignedEmployees) {
      const employees = await EmployeeModel.find({
        studioId: auth.studioId,
        id: { $in: body.assignedEmployees },
      })
        .select("_id")
        .lean();
      update.assignedEmployees = employees.map((employee: any) => employee._id);
    }

    const updated = await ProjectModel.findOneAndUpdate(
      { id: params.id, studioId: auth.studioId },
      { $set: update },
      { new: true }
    )
      .populate("assignedEmployees", "fullName employeeId profilePhoto")
      .populate("client", "name phone email")
      .lean();

    await audit({
      req,
      auth,
      studioId: auth.studioId,
      action: "project.update",
      entityType: "Project",
      entityId: params.id,
      details: { fields: Object.keys(body), title: existing.title },
    });

    return NextResponse.json({ success: true, project: serialize(updated as any) });
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireStaff(req, "projects:write");
    const existing = await findProject(params.id, auth.studioId);

    await ProjectModel.deleteOne({ id: params.id, studioId: auth.studioId });
    await EmployeeModel.updateMany(
      { studioId: auth.studioId },
      { $pull: { assignedProjects: existing._id } }
    );

    await audit({
      req,
      auth,
      studioId: auth.studioId,
      action: "project.delete",
      entityType: "Project",
      entityId: params.id,
      details: { title: existing.title },
    });

    return NextResponse.json({ success: true, message: "Project deleted." });
  } catch (error) {
    return handleError(error);
  }
}
