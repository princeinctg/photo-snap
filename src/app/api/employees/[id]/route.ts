import { NextResponse } from "next/server";
import { ApiError, audit, handleError, parseBody, requireAuth, requireStaff } from "@/lib/api";
import { can } from "@/lib/permissions";
import { EmployeeModel } from "@/lib/models";
import { employeeUpdateSchema } from "@/lib/validation";

async function findEmployee(id: string, studioId: string) {
  const employee = await EmployeeModel.findOne({ id, studioId }).lean();
  if (!employee) throw new ApiError(404, "Employee not found", "NOT_FOUND");
  return employee as any;
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuth(req);
    const employee = await findEmployee(params.id, auth.studioId);
    const isSelf = employee.userId === auth.userId;
    if (!isSelf && !can(auth.role, "employees:read")) {
      throw new ApiError(403, "You do not have permission to view this employee.", "FORBIDDEN");
    }
    return NextResponse.json({ success: true, employee: { ...employee, id: employee.id || String(employee._id) } });
  } catch (error) {
    return handleError(error);
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireStaff(req, "employees:write");
    const body = await parseBody(req, employeeUpdateSchema);
    const existing = await findEmployee(params.id, auth.studioId);

    if (body.employeeId && body.employeeId !== existing.employeeId) {
      const duplicate = await EmployeeModel.findOne({
        studioId: auth.studioId,
        employeeId: body.employeeId,
        id: { $ne: params.id },
      }).lean();
      if (duplicate) {
        throw new ApiError(409, "An employee with this employee ID already exists.", "DUPLICATE");
      }
    }

    const updated = await EmployeeModel.findOneAndUpdate(
      { id: params.id, studioId: auth.studioId },
      { $set: body },
      { new: true }
    ).lean();

    await audit({
      req,
      auth,
      studioId: auth.studioId,
      action: "employee.update",
      entityType: "Employee",
      entityId: params.id,
      details: { fields: Object.keys(body) },
    });

    return NextResponse.json({ success: true, employee: { ...(updated as any), id: existing.id } });
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireStaff(req, "employees:write");
    const existing = await findEmployee(params.id, auth.studioId);
    await EmployeeModel.updateOne(
      { id: params.id, studioId: auth.studioId },
      { $set: { employmentStatus: "terminated" } }
    );
    await audit({
      req,
      auth,
      studioId: auth.studioId,
      action: "employee.terminate",
      entityType: "Employee",
      entityId: params.id,
      details: { fullName: existing.fullName },
    });
    return NextResponse.json({ success: true, message: "Employee marked as terminated." });
  } catch (error) {
    return handleError(error);
  }
}
