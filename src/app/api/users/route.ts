import { NextResponse } from "next/server";
import { ApiError, audit, escapeRegex, getPagination, handleError, paginationMeta, parseBody, requireAuth } from "@/lib/api";
import { assignableRoles } from "@/lib/permissions";
import { ProfileModel, UserModel } from "@/lib/models";
import { hashPassword } from "@/lib/auth";
import { userCreateSchema } from "@/lib/validation";
import type { UserRole } from "@/types";

export async function GET(req: Request) {
  try {
    const auth = await requireAuth(req, "users:read");
    const options = getPagination(req, { limit: 200, sortBy: "createdAt" });
    const { searchParams } = new URL(req.url);
    const filter: Record<string, unknown> = { studioId: auth.studioId };

    const role = searchParams.get("role");
    if (role) filter.role = role;
    const status = searchParams.get("status");
    if (status) filter.accountStatus = status;

    if (options.search) {
      const rx = new RegExp(escapeRegex(options.search), "i");
      filter.$or = [{ name: rx }, { email: rx }, { phone: rx }];
    }

    const sortField = ["createdAt", "name", "email", "lastLogin"].includes(options.sortBy)
      ? options.sortBy
      : "createdAt";

    const [total, docs] = await Promise.all([
      UserModel.countDocuments(filter),
      UserModel.find(filter)
        .select("-passwordHash")
        .sort({ [sortField]: options.sortOrder })
        .skip(options.skip)
        .limit(options.limit)
        .lean(),
    ]);

    const users = docs.map((user: any) => ({
      ...user,
      id: user.id || String(user._id),
    }));

    return NextResponse.json({
      success: true,
      users,
      data: users,
      pagination: paginationMeta(total, options),
    });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireAuth(req, "users:write");
    const body = await parseBody(req, userCreateSchema);
    const allowed = assignableRoles(auth.role);

    const role = (body.role || "employee") as UserRole;
    if (!allowed.includes(role)) {
      throw new ApiError(403, `Your role cannot create a ${role} account.`, "FORBIDDEN");
    }

    const existing = await UserModel.findOne({ email: body.email }).lean();
    if (existing) {
      throw new ApiError(409, "A user with this email address already exists.", "DUPLICATE");
    }

    const userId = `usr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const passwordHash = await hashPassword(body.password);

    const created = await UserModel.create({
      id: userId,
      name: body.name,
      email: body.email,
      phone: body.phone,
      passwordHash,
      role: body.role,
      accountStatus: body.accountStatus,
      emailVerified: body.emailVerified,
      studioId: auth.studioId,
      studioName: auth.studioName,
      avatar: body.avatar || "",
      profileImage: body.avatar || "",
      createdBy: auth.userObjectId,
    });

    await ProfileModel.findOneAndUpdate(
      { userId },
      {
        $setOnInsert: {
          user: created._id,
          userId,
          studioId: auth.studioId,
          displayName: body.name,
          profilePhoto: body.avatar || "",
          contact: { email: body.email, phone: body.phone },
        },
      },
      { upsert: true }
    );

    await audit({
      req,
      auth,
      studioId: auth.studioId,
      action: "user.create",
      entityType: "User",
      entityId: userId,
      details: { role: body.role, email: body.email },
    });

    return NextResponse.json(
      {
        success: true,
        user: {
          id: userId,
          name: body.name,
          email: body.email,
          phone: body.phone,
          role: body.role,
          accountStatus: body.accountStatus,
          emailVerified: body.emailVerified,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    return handleError(error);
  }
}
