import { NextResponse } from "next/server";
import { ZodError, type ZodType } from "zod";
import { ActivityLogModel } from "./models";
import { getSessionFromRequest, clientIp, type AuthContext } from "./session";
import { can, type Permission } from "./permissions";

export class ApiError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(status: number, message: string, code = "API_ERROR", details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function jsonOk<T extends Record<string, unknown>>(data: T, status = 200) {
  return NextResponse.json({ success: true, ...data }, { status });
}

export function jsonError(
  message: string,
  status = 400,
  code = "BAD_REQUEST",
  details?: unknown
) {
  return NextResponse.json({ success: false, error: message, code, details }, { status });
}

export function handleError(error: unknown) {
  if (error instanceof ApiError) {
    return jsonError(error.message, error.status, error.code, error.details);
  }
  if (error instanceof ZodError) {
    return jsonError("Validation failed", 422, "VALIDATION_ERROR", error.issues);
  }
  if (error instanceof SyntaxError) {
    return jsonError("Invalid JSON body", 400, "INVALID_JSON");
  }
  const message = error instanceof Error ? error.message : "Unexpected server error";
  if (process.env.NODE_ENV !== "production") {
    console.error("[api]", error);
  }
  // Duplicate key errors from unique indexes
  if (typeof error === "object" && error && (error as any).code === 11000) {
    return jsonError("A record with these unique values already exists.", 409, "DUPLICATE");
  }
  return jsonError(message, 500, "INTERNAL_ERROR");
}

/**
 * Authenticate an API request and optionally require a permission.
 * Throws ApiError so route handlers can pass it to handleError().
 */
export async function requireAuth(req: Request, permission?: Permission): Promise<AuthContext> {
  const auth = await getSessionFromRequest(req);
  if (!auth) {
    throw new ApiError(401, "Authentication required. Please sign in.", "UNAUTHENTICATED");
  }
  if (permission && !can(auth.role, permission)) {
    throw new ApiError(403, "You do not have permission to perform this action.", "FORBIDDEN");
  }
  return auth;
}

export async function requireStaff(req: Request, permission?: Permission): Promise<AuthContext> {
  const auth = await requireAuth(req, permission);
  if (auth.role === "client") {
    throw new ApiError(403, "Staff access required.", "FORBIDDEN");
  }
  return auth;
}

export async function parseBody<T>(req: Request, schema: ZodType<T>): Promise<T> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new ApiError(400, "Request body must be valid JSON.", "INVALID_JSON");
  }
  const sanitized = sanitizeInput(raw);
  const parsed = schema.safeParse(sanitized);
  if (!parsed.success) {
    throw new ApiError(422, "Validation failed", "VALIDATION_ERROR", parsed.error.issues);
  }
  return parsed.data;
}

/** Remove MongoDB operators and prototype-pollution keys from user input. */
export function sanitizeInput<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeInput(item)) as unknown as T;
  }
  if (value && typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      if (key.startsWith("$") || key.includes(".") || key === "__proto__" || key === "constructor" || key === "prototype") {
        continue;
      }
      result[key] = sanitizeInput(item);
    }
    return result as T;
  }
  return value;
}

export interface PaginationOptions {
  page: number;
  limit: number;
  skip: number;
  search: string;
  sortBy: string;
  sortOrder: 1 | -1;
}

export function getPagination(req: Request, defaults?: { limit?: number; sortBy?: string }): PaginationOptions {
  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
  const rawLimit = parseInt(searchParams.get("limit") || String(defaults?.limit ?? 100), 10) || 100;
  const limit = Math.min(500, Math.max(1, rawLimit));
  const search = (searchParams.get("q") || searchParams.get("search") || "").trim().slice(0, 200);
  const sortBy = (searchParams.get("sortBy") || defaults?.sortBy || "createdAt").replace(/[^a-zA-Z0-9_.]/g, "");
  const sortOrder: 1 | -1 = searchParams.get("sortOrder") === "asc" ? 1 : -1;
  return { page, limit, skip: (page - 1) * limit, search, sortBy, sortOrder };
}

export function paginationMeta(total: number, options: PaginationOptions) {
  return {
    page: options.page,
    limit: options.limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / options.limit)),
    hasNext: options.page * options.limit < total,
    hasPrev: options.page > 1,
  };
}

export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function toLean(doc: any) {
  if (!doc) return doc;
  const plain = typeof doc.toObject === "function" ? doc.toObject() : doc;
  return { ...plain, id: plain.id || String(plain._id) };
}

export function toLeanList(docs: any[]) {
  return docs.map(toLean);
}

export async function audit(params: {
  req?: Request;
  auth?: AuthContext | null;
  studioId: string;
  action: string;
  entityType: string;
  entityId?: string;
  details?: Record<string, unknown>;
}) {
  try {
    await ActivityLogModel.create({
      id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      studioId: params.studioId,
      actor: params.auth?.userObjectId || null,
      actorId: params.auth?.userId || "",
      actorName: params.auth?.name || "System",
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId || "",
      details: params.details || {},
      ip: clientIp(params.req),
      userAgent: params.req?.headers.get("user-agent") || "",
    });
  } catch (error) {
    // Audit logging must never break the business operation.
    console.warn("Audit log failed:", error);
  }
}

/** Determine whether a client-role user may access a given client record. */
export function assertClientAccess(auth: AuthContext, clientUserId?: string) {
  if (auth.role !== "client") return;
  if (!clientUserId || clientUserId !== auth.userId) {
    throw new ApiError(403, "You can only access your own records.", "FORBIDDEN");
  }
}

export function isOwnerOrStaff(auth: AuthContext, ownerUserId?: string): boolean {
  return auth.role !== "client" || (!!ownerUserId && ownerUserId === auth.userId);
}
