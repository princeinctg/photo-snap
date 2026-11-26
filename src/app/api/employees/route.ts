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
import { EmployeeModel, UserModel } from "@/lib/models";
import { employeeCreateSchema } from "@/lib/validation";
import { requireAuth } from "@/lib/api";

export async function GET(req: Request) {
  try {
    const auth = await requireAuth(req);
    if (!can(auth.role, "employees:read")) {
      throw new ApiError(403, "You do not have permission to view employees.", "FORBIDDEN");
    }

    const options = getPagination(req, { limit: 200, sortBy: "createdAt" });
    const { searchParams } = new URL(req.url);
    const filter: Record<string, unknown> = { studioId: auth.studioId };

    const department = searchParams.get("department");
    if (department) filter.department = department;
    const status = searchParams.get("status");
    if (status) filter.employmentStatus = status;

    if (options.search) {
      const rx = new RegExp(escapeRegex(options.search), "i");
      filter.$or = [
        { fullName: rx },
        { employeeId: rx },
        { email: rx },
        { phone: rx },
        { jobPosition: rx },
        { department: rx },
      ];
    }

    const sortField = ["createdAt", "fullName", "salary", "joiningDate"].includes(options.sortBy)
      ? options.sortBy
      : "createdAt";

    const [total, docs] = await Promise.all([
      EmployeeModel.countDocuments(filter),
      EmployeeModel.find(filter)
        .sort({ [sortField]: options.sortOrder })
        .skip(options.skip)
        .limit(options.limit)
        .lean(),
    ]);

    const employees = toLeanList(docs);
    return NextResponse.json({
      success: true,
      employees,
      data: employees,
      pagination: paginationMeta(total, options),
    });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireStaff(req, "employees:write");
    const body = await parseBody(req, employeeCreateSchema);

    const count = await EmployeeModel.countDocuments({ studioId: auth.studioId });
    const employeeId = body.employeeId?.trim() || `EMP-${String(count + 1).padStart(4, "0")}`;

    const duplicate = await EmployeeModel.findOne({ studioId: auth.studioId, employeeId }).lean();
    if (duplicate) {
      throw new ApiError(409, "An employee with this employee ID already exists.", "DUPLICATE");
    }

    let userRef = null;
    if (body.userId) {
      const user = await UserModel.findOne({ id: body.userId, studioId: auth.studioId })
        .select("_id")
        .lean<any>();
      userRef = user?._id || null;
    }

    const created = await EmployeeModel.create({
      ...body,
      employeeId,
      id: `emp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      studioId: auth.studioId,
      user: userRef,
      createdBy: auth.userObjectId,
      assignedProjects: [],
      performanceRecords: [],
    });

    await audit({
      req,
      auth,
      studioId: auth.studioId,
      action: "employee.create",
      entityType: "Employee",
      entityId: created.id,
      details: { fullName: body.fullName, employeeId },
    });

    return NextResponse.json(
      { success: true, employee: { ...created.toObject(), id: created.id } },
      { status: 201 }
    );
  } catch (error) {
    return handleError(error);
  }
}
