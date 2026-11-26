import crypto from "crypto";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { cookies } from "next/headers";
import { SessionModel, UserModel } from "./models";
import type { UserRole } from "@/types";

export const SESSION_COOKIE_NAME = "photo_studio_session";
export const SESSION_TTL_DAYS = 7;

export interface SessionPayload {
  userId: string;
  sessionId: string;
  jti?: string;
  email: string;
  name: string;
  role: UserRole;
  studioId: string;
  studioName?: string;
}

export interface AuthContext extends SessionPayload {
  userObjectId: string;
  accountStatus: string;
  emailVerified: boolean;
  sessionExpiresAt: string;
}

const DEV_SECRET = "photo_studio_os_dev_only_secret_change_me_please_32_chars";

export function getJwtSecret(): string {
  const secret = process.env.AUTH_SECRET || process.env.JWT_SECRET;
  if (secret && secret.length >= 16) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("AUTH_SECRET (or JWT_SECRET) must be set to at least 16 characters in production.");
  }
  return DEV_SECRET;
}

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function randomToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString("hex");
}

export function signSessionToken(payload: SessionPayload, expiresInSeconds: number): string {
  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: expiresInSeconds,
    issuer: "photo-studio-os",
    audience: "photo-studio-os-web",
  });
}

export function verifySessionToken(token: string): SessionPayload | null {
  try {
    const decoded = jwt.verify(token, getJwtSecret(), {
      issuer: "photo-studio-os",
      audience: "photo-studio-os-web",
    }) as jwt.JwtPayload & SessionPayload;
    if (!decoded?.userId || !decoded?.sessionId) return null;
    return {
      userId: decoded.userId,
      sessionId: decoded.sessionId,
      jti: decoded.jti,
      email: decoded.email,
      name: decoded.name,
      role: decoded.role,
      studioId: decoded.studioId,
      studioName: decoded.studioName,
    };
  } catch {
    return null;
  }
}

function cookieValueFromHeader(req: Request): string | null {
  const header = req.headers.get("cookie") || "";
  for (const part of header.split(";")) {
    const [rawKey, ...rest] = part.trim().split("=");
    if (rawKey === SESSION_COOKIE_NAME) return decodeURIComponent(rest.join("="));
  }
  return null;
}

export function readSessionToken(req?: Request): string | null {
  const bearer = req?.headers.get("authorization");
  if (bearer?.toLowerCase().startsWith("bearer ")) return bearer.slice(7).trim();

  if (req) {
    const fromHeader = cookieValueFromHeader(req);
    if (fromHeader) return fromHeader;
  }

  try {
    return cookies().get(SESSION_COOKIE_NAME)?.value || null;
  } catch {
    return null;
  }
}

export function setSessionCookie(token: string, maxAgeSeconds: number) {
  const cookieStore = cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: maxAgeSeconds,
    path: "/",
  });
}

export function removeSessionCookie() {
  try {
    cookies().set(SESSION_COOKIE_NAME, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0,
      path: "/",
    });
  } catch {
    // cookies() is unavailable outside a request context
  }
}

/**
 * Create a persisted session and return its signed JWT.
 * The JWT is stored in an httpOnly cookie by the caller.
 */
export async function createSession(params: {
  user: {
    _id: mongoose.Types.ObjectId | string;
    id: string;
    email: string;
    name: string;
    role: UserRole;
    studioId: string;
    studioName?: string;
  };
  req?: Request;
  rememberMe?: boolean;
}): Promise<{ token: string; sessionId: string; expiresAt: Date; maxAgeSeconds: number }> {
  const days = params.rememberMe ? 30 : SESSION_TTL_DAYS;
  const maxAgeSeconds = days * 24 * 60 * 60;
  const expiresAt = new Date(Date.now() + maxAgeSeconds * 1000);
  const sessionId = new mongoose.Types.ObjectId();
  const jti = randomToken(32);

  const payload: SessionPayload = {
    userId: params.user.id,
    sessionId: sessionId.toString(),
    jti,
    email: params.user.email,
    name: params.user.name,
    role: params.user.role,
    studioId: params.user.studioId,
    studioName: params.user.studioName,
  };

  const token = signSessionToken(payload, maxAgeSeconds);

  await SessionModel.create({
    _id: sessionId,
    user: params.user._id,
    userId: params.user.id,
    tokenHash: hashToken(jti),
    userAgent: params.req?.headers.get("user-agent") || "",
    ip: clientIp(params.req),
    expiresAt,
    lastActiveAt: new Date(),
  });

  // The jti is embedded in a private claim so sessions can be matched if needed.
  // It is not part of the public SessionPayload type.
  return { token, sessionId: sessionId.toString(), expiresAt, maxAgeSeconds };
}

/**
 * Verify the request JWT and ensure the matching session is still active.
 * Also re-checks the user account status on every protected request.
 */
export async function getSessionFromRequest(req?: Request): Promise<AuthContext | null> {
  const token = readSessionToken(req);
  if (!token) return null;

  const payload = verifySessionToken(token);
  if (!payload) return null;

  if (!mongoose.isValidObjectId(payload.sessionId)) return null;

  const session = await SessionModel.findOne({
    _id: payload.sessionId,
    revokedAt: null,
    expiresAt: { $gt: new Date() },
  }).lean<any>();

  if (!session) return null;
  if (payload.jti && session.tokenHash !== hashToken(payload.jti)) return null;

  const user = await UserModel.findOne({ id: payload.userId })
    .select("_id id email name role studioId studioName accountStatus emailVerified")
    .lean<any>();

  if (!user || user.accountStatus !== "active") return null;

  // Keep the session activity timestamp fresh without writing on every request.
  const lastActive = session.lastActiveAt ? new Date(session.lastActiveAt).getTime() : 0;
  if (Date.now() - lastActive > 5 * 60 * 1000) {
    SessionModel.updateOne({ _id: session._id }, { $set: { lastActiveAt: new Date() } }).catch(() => {});
  }

  return {
    ...payload,
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role as UserRole,
    studioId: user.studioId,
    studioName: user.studioName,
    userObjectId: String(user._id),
    accountStatus: user.accountStatus,
    emailVerified: !!user.emailVerified,
    sessionExpiresAt: new Date(session.expiresAt).toISOString(),
  };
}

/** JWT-only helper kept for synchronous call sites (never use for authorization alone). */
export function getSessionUser(): SessionPayload | null {
  const token = readSessionToken();
  if (!token) return null;
  return verifySessionToken(token);
}

export async function revokeSession(sessionId: string, userId?: string): Promise<boolean> {
  if (!mongoose.isValidObjectId(sessionId)) return false;
  const query: Record<string, unknown> = { _id: sessionId, revokedAt: null };
  if (userId) query.userId = userId;
  const result = await SessionModel.updateOne(query, { $set: { revokedAt: new Date() } });
  return result.modifiedCount > 0;
}

export async function revokeAllSessions(userId: string, exceptSessionId?: string): Promise<number> {
  const query: Record<string, unknown> = { userId, revokedAt: null };
  if (exceptSessionId && mongoose.isValidObjectId(exceptSessionId)) {
    query._id = { $ne: new mongoose.Types.ObjectId(exceptSessionId) };
  }
  const result = await SessionModel.updateMany(query, { $set: { revokedAt: new Date() } });
  return result.modifiedCount;
}

export async function listSessions(userId: string, currentSessionId?: string) {
  const sessions = await SessionModel.find({
    userId,
    revokedAt: null,
    expiresAt: { $gt: new Date() },
  })
    .sort({ lastActiveAt: -1 })
    .lean();

  return sessions.map((s: any) => ({
    id: String(s._id),
    userAgent: s.userAgent || "",
    ip: s.ip || "",
    lastActiveAt: s.lastActiveAt ? new Date(s.lastActiveAt).toISOString() : undefined,
    createdAt: s.createdAt ? new Date(s.createdAt).toISOString() : "",
    expiresAt: new Date(s.expiresAt).toISOString(),
    current: currentSessionId ? String(s._id) === currentSessionId : false,
  }));
}

export function clientIp(req?: Request): string {
  if (!req) return "";
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "";
}

export async function touchSession(sessionId: string) {
  if (!mongoose.isValidObjectId(sessionId)) return;
  await SessionModel.updateOne({ _id: sessionId }, { $set: { lastActiveAt: new Date() } });
}
