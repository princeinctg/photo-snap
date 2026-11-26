import { NextResponse } from "next/server";
import { ApiError, handleError, requireAuth } from "@/lib/api";
import { EmployeeModel } from "@/lib/models";

export async function GET(req: Request) {
  try {
    const auth = await requireAuth(req);
    const employee = await EmployeeModel.findOne({
      studioId: auth.studioId,
      userId: auth.userId,
    }).lean();

    if (!employee) {
      throw new ApiError(404, "No employee record is linked to this account.", "NOT_FOUND");
    }

    return NextResponse.json({
      success: true,
      employee: { ...employee, id: (employee as any).id || String((employee as any)._id) },
    });
  } catch (error) {
    return handleError(error);
  }
}
