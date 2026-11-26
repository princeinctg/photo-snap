import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import type { User, UserRole } from "@/types";
import { DEFAULT_STUDIO_ID, initialSettings } from "./demo-data";
import {
  EmailVerificationTokenModel,
  PasswordResetTokenModel,
  ProfileModel,
  SessionModel,
  StudioSettingsModel,
  UserModel,
} from "./models";
import { connectDB } from "./mongodb";
import {
  createSession,
  getSessionFromRequest,
  getSessionUser,
  hashToken,
  randomToken,
  removeSessionCookie,
  revokeAllSessions,
  revokeSession,
  setSessionCookie,
  signSessionToken as signJwtToken,
  verifySessionToken,
  type AuthContext,
  type SessionPayload,
} from "./session";
import { ApiError, audit } from "./api";
import {
  emailVerificationRequired,
  exposeDevTokens,
  sendPasswordResetEmail,
  sendVerificationEmail,
} from "./email";

export {
  getSessionFromRequest,
  getSessionUser,
  setSessionCookie,
  removeSessionCookie,
  verifySessionToken,
  type AuthContext,
  type SessionPayload,
};

export async function hashPassword(plainText: string): Promise<string> {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(plainText, salt);
}

export async function comparePassword(plainText: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plainText, hash);
}

export function signSessionToken(payload: SessionPayload, expiresInSeconds = 7 * 24 * 60 * 60): string {
  return signJwtToken(payload, expiresInSeconds);
}

export function getAuthStudioId(req?: Request): string {
  const session = getSessionUser();
  if (session?.studioId) return session.studioId;

  if (req) {
    try {
      const { searchParams } = new URL(req.url);
      const queryStudioId = searchParams.get("studioId");
      if (queryStudioId) return queryStudioId;
    } catch {}
  }

  return DEFAULT_STUDIO_ID;
}

export const defaultAdminUser: User = {
  id: "user_owner_001",
  name: "Studio Principal / Owner",
  email: process.env.INITIAL_ADMIN_EMAIL || "owner@photostudio.com",
  role: "super_admin",
  accountStatus: "active",
  emailVerified: true,
  studioId: DEFAULT_STUDIO_ID,
  studioName: "PhotoSnap Studio",
  avatar: "",
  createdAt: new Date().toISOString(),
};

async function requireDatabase(): Promise<void> {
  try {
    await connectDB();
  } catch {
    const message = process.env.MONGODB_URI
      ? "Unable to connect to MongoDB. Check the server-side URI and Atlas network access."
      : "MongoDB is not available. Configure MONGODB_URI in your environment before using authentication.";
    throw new ApiError(503, message, "DATABASE_UNAVAILABLE");
  }
}

function newId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

async function createStudioWorkspace(params: {
  name: string;
  email: string;
  studioName: string;
  phone?: string;
}): Promise<{ studioId: string; studioName: string }> {
  const studioId = newId("std");
  const studioName = params.studioName.trim() || `${params.name}'s Photography Studio`;

  await StudioSettingsModel.create({
    ...initialSettings,
    id: `set_${studioId}`,
    studioId,
    studioName,
    email: params.email,
    phone: params.phone || initialSettings.phone,
    updatedAt: new Date().toISOString(),
  });

  return { studioId, studioName };
}

async function ensureUserProfile(user: {
  _id: mongoose.Types.ObjectId | string;
  id: string;
  name: string;
  email: string;
  phone?: string;
  studioId: string;
  avatar?: string;
}) {
  await ProfileModel.findOneAndUpdate(
    { userId: user.id },
    {
      $setOnInsert: {
        user: user._id,
        userId: user.id,
        studioId: user.studioId,
        displayName: user.name,
        profilePhoto: user.avatar || "",
        contact: { email: user.email, phone: user.phone || "" },
      },
    },
    { upsert: true }
  );
}

/**
 * Register a new studio owner. The first user of a studio is always a
 * super admin; additional users are created by administrators through
 * /api/users with an explicit role.
 */
export async function registerUser(params: {
  name: string;
  email: string;
  password: string;
  studioName?: string;
  phone?: string;
  req?: Request;
}): Promise<{ user: SessionPayload; success: boolean; requiresVerification?: boolean; verificationToken?: string }> {
  await requireDatabase();

  const email = params.email.trim().toLowerCase();
  const name = params.name.trim();

  const existing = await UserModel.findOne({ email }).lean();
  if (existing) {
    throw new ApiError(409, "An account with this email address already exists. Please log in instead.", "EMAIL_IN_USE");
  }

  const { studioId, studioName } = await createStudioWorkspace({
    name,
    email,
    studioName: params.studioName || "",
    phone: params.phone,
  });

  const passwordHash = await hashPassword(params.password);
  const verificationRequired = emailVerificationRequired();
  const userId = newId("usr");

  const created = await UserModel.create({
    id: userId,
    name,
    email,
    phone: params.phone || "",
    passwordHash,
    role: "super_admin" as UserRole,
    accountStatus: verificationRequired ? "pending" : "active",
    emailVerified: !verificationRequired,
    studioId,
    studioName,
    avatar: "",
    profileImage: "",
  });

  await ensureUserProfile({
    _id: created._id,
    id: userId,
    name,
    email,
    phone: params.phone,
    studioId,
  });

  let verificationToken: string | undefined;
  if (verificationRequired) {
    verificationToken = await issueEmailVerification(created);
  }

  const sessionPayload: SessionPayload = {
    userId,
    sessionId: "",
    email,
    name,
    role: "super_admin",
    studioId,
    studioName,
  };

  if (!verificationRequired) {
    const session = await createSession({
      user: {
        _id: created._id,
        id: userId,
        email,
        name,
        role: "super_admin",
        studioId,
        studioName,
      },
      req: params.req,
    });
    setSessionCookie(session.token, session.maxAgeSeconds);
    sessionPayload.sessionId = session.sessionId;
  }

  await audit({
    req: params.req,
    auth: {
      userId,
      sessionId: "",
      email,
      name,
      role: "super_admin",
      studioId,
      studioName,
      userObjectId: String(created._id),
      accountStatus: "active",
      emailVerified: !verificationRequired,
      sessionExpiresAt: "",
    },
    studioId,
    action: "user.register",
    entityType: "User",
    entityId: userId,
    details: { studioName, verificationRequired },
  });

  return {
    user: sessionPayload,
    success: true,
    requiresVerification: verificationRequired,
    verificationToken: exposeDevTokens() ? verificationToken : undefined,
  };
}

async function issueEmailVerification(user: any): Promise<string> {
  const token = randomToken(32);
  await EmailVerificationTokenModel.updateMany(
    { userId: user.id, verifiedAt: null },
    { $set: { verifiedAt: new Date() } }
  );
  await EmailVerificationTokenModel.create({
    user: user._id,
    userId: user.id,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  });
  await sendVerificationEmail(user.email, user.name, token);
  return token;
}

/**
 * Create the initial super admin from environment variables if the database
 * has no users yet. This makes first-run installation deterministic without
 * hardcoding credentials in source.
 */
export async function ensureBootstrapAdmin(): Promise<{ created: boolean; email?: string }> {
  await requireDatabase();

  const count = await UserModel.estimatedDocumentCount();
  if (count > 0) return { created: false };

  const email = (process.env.INITIAL_ADMIN_EMAIL || "owner@photostudio.com").toLowerCase();
  const password = process.env.INITIAL_ADMIN_PASSWORD || "StudioAdmin123!";
  const name = process.env.INITIAL_ADMIN_NAME || "Studio Principal";
  const studioName = process.env.INITIAL_STUDIO_NAME || "PhotoSnap Studio";

  const passwordHash = await hashPassword(password);
  const userId = newId("usr");

  const settings = await StudioSettingsModel.findOne({ studioId: DEFAULT_STUDIO_ID }).lean();
  if (!settings) {
    await StudioSettingsModel.create({
      ...initialSettings,
      id: `set_${DEFAULT_STUDIO_ID}`,
      studioId: DEFAULT_STUDIO_ID,
      studioName,
      email,
    });
  }

  const created = await UserModel.create({
    id: userId,
    name,
    email,
    passwordHash,
    role: "super_admin",
    accountStatus: "active",
    emailVerified: true,
    studioId: DEFAULT_STUDIO_ID,
    studioName,
  });

  await ensureUserProfile({
    _id: created._id,
    id: userId,
    name,
    email,
    studioId: DEFAULT_STUDIO_ID,
  });

  return { created: true, email };
}

/**
 * Authenticate a user, enforce account status, persist a session, and set the
 * httpOnly session cookie.
 */
export async function loginUser(params: {
  email: string;
  password: string;
  rememberMe?: boolean;
  req?: Request;
}): Promise<{ user: SessionPayload; success: boolean }> {
  await requireDatabase();

  const email = params.email.trim().toLowerCase();

  // First-run bootstrap: only runs when the users collection is empty.
  await ensureBootstrapAdmin();

  const user = await UserModel.findOne({ email }).select("+passwordHash");
  if (!user) {
    throw new ApiError(401, "Invalid email or password.", "INVALID_CREDENTIALS");
  }

  if (user.accountStatus === "suspended" || user.accountStatus === "deactivated") {
    throw new ApiError(403, "This account has been disabled. Contact your studio administrator.", "ACCOUNT_DISABLED");
  }

  if (
    user.accountStatus === "pending" ||
    (emailVerificationRequired() && !user.emailVerified)
  ) {
    throw new ApiError(
      403,
      "Please verify your email address before signing in.",
      "EMAIL_NOT_VERIFIED"
    );
  }

  const match = await comparePassword(params.password, user.passwordHash);
  if (!match) {
    throw new ApiError(401, "Invalid email or password.", "INVALID_CREDENTIALS");
  }

  const session = await createSession({
    user: {
      _id: user._id,
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as UserRole,
      studioId: user.studioId,
      studioName: user.studioName,
    },
    req: params.req,
    rememberMe: params.rememberMe,
  });

  user.lastLogin = new Date();
  await user.save();

  setSessionCookie(session.token, session.maxAgeSeconds);

  await audit({
    req: params.req,
    auth: {
      userId: user.id,
      sessionId: session.sessionId,
      email: user.email,
      name: user.name,
      role: user.role as UserRole,
      studioId: user.studioId,
      studioName: user.studioName,
      userObjectId: String(user._id),
      accountStatus: user.accountStatus,
      emailVerified: user.emailVerified,
      sessionExpiresAt: session.expiresAt.toISOString(),
    },
    studioId: user.studioId,
    action: "user.login",
    entityType: "User",
    entityId: user.id,
  });

  return {
    user: {
      userId: user.id,
      sessionId: session.sessionId,
      email: user.email,
      name: user.name,
      role: user.role as UserRole,
      studioId: user.studioId,
      studioName: user.studioName,
    },
    success: true,
  };
}

export async function logoutUser(req?: Request): Promise<void> {
  try {
    await requireDatabase();
    const session = await getSessionFromRequest(req);
    if (session) {
      await revokeSession(session.sessionId, session.userId);
      await audit({
        req,
        auth: session,
        studioId: session.studioId,
        action: "user.logout",
        entityType: "User",
        entityId: session.userId,
      });
    }
  } finally {
    removeSessionCookie();
  }
}

/**
 * Always returns the same response shape to avoid account enumeration.
 */
export async function forgotPassword(
  emailInput: string,
  req?: Request
): Promise<{ message: string; resetToken?: string }> {
  await requireDatabase();
  const email = emailInput.trim().toLowerCase();
  const genericMessage =
    "If an account exists for that email, a password reset link has been sent.";

  const user = await UserModel.findOne({ email });
  if (!user) return { message: genericMessage };

  const token = randomToken(32);
  await PasswordResetTokenModel.updateMany(
    { userId: user.id, usedAt: null },
    { $set: { usedAt: new Date() } }
  );
  await PasswordResetTokenModel.create({
    user: user._id,
    userId: user.id,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + 60 * 60 * 1000),
  });

  await sendPasswordResetEmail(user.email, user.name, token);

  await audit({
    req,
    studioId: user.studioId,
    action: "user.password_reset_requested",
    entityType: "User",
    entityId: user.id,
  });

  return {
    message: genericMessage,
    resetToken: exposeDevTokens() ? token : undefined,
  };
}

export async function resetPassword(params: {
  token: string;
  password: string;
  req?: Request;
}): Promise<{ message: string }> {
  await requireDatabase();

  const record = await PasswordResetTokenModel.findOne({
    tokenHash: hashToken(params.token),
    usedAt: null,
    expiresAt: { $gt: new Date() },
  });

  if (!record) {
    throw new ApiError(400, "This reset link is invalid or has expired.", "INVALID_TOKEN");
  }

  const user = await UserModel.findOne({ id: record.userId });
  if (!user) {
    throw new ApiError(400, "This reset link is invalid or has expired.", "INVALID_TOKEN");
  }

  user.passwordHash = await hashPassword(params.password);
  user.passwordChangedAt = new Date();
  if (user.accountStatus === "pending" && user.emailVerified) {
    user.accountStatus = "active";
  }
  await user.save();

  record.usedAt = new Date();
  await record.save();

  await revokeAllSessions(user.id);

  await audit({
    req: params.req,
    studioId: user.studioId,
    action: "user.password_reset",
    entityType: "User",
    entityId: user.id,
  });

  return { message: "Password updated successfully. Please sign in with your new password." };
}

export async function verifyEmail(token: string, req?: Request): Promise<{ message: string }> {
  await requireDatabase();

  const record = await EmailVerificationTokenModel.findOne({
    tokenHash: hashToken(token),
    verifiedAt: null,
    expiresAt: { $gt: new Date() },
  });

  if (!record) {
    throw new ApiError(400, "This verification link is invalid or has expired.", "INVALID_TOKEN");
  }

  const user = await UserModel.findOne({ id: record.userId });
  if (!user) {
    throw new ApiError(400, "This verification link is invalid or has expired.", "INVALID_TOKEN");
  }

  user.emailVerified = true;
  if (user.accountStatus === "pending") user.accountStatus = "active";
  await user.save();

  record.verifiedAt = new Date();
  await record.save();

  await audit({
    req,
    studioId: user.studioId,
    action: "user.email_verified",
    entityType: "User",
    entityId: user.id,
  });

  return { message: "Email verified successfully. You can now sign in." };
}

export async function resendVerificationEmail(emailInput: string): Promise<{ message: string; verificationToken?: string }> {
  await requireDatabase();
  const email = emailInput.trim().toLowerCase();
  const generic = { message: "If the account needs verification, a new link has been sent." };
  const user = await UserModel.findOne({ email });
  if (!user || user.emailVerified) return generic;

  const token = await issueEmailVerification(user);
  return { ...generic, verificationToken: exposeDevTokens() ? token : undefined };
}

export async function changePassword(params: {
  auth: AuthContext;
  currentPassword: string;
  newPassword: string;
  req?: Request;
}): Promise<{ message: string }> {
  await requireDatabase();

  const user = await UserModel.findOne({ id: params.auth.userId }).select("+passwordHash");
  if (!user) throw new ApiError(404, "User not found", "NOT_FOUND");

  const match = await comparePassword(params.currentPassword, user.passwordHash);
  if (!match) throw new ApiError(400, "Current password is incorrect.", "INVALID_PASSWORD");

  user.passwordHash = await hashPassword(params.newPassword);
  user.passwordChangedAt = new Date();
  await user.save();

  await revokeAllSessions(user.id, params.auth.sessionId);

  await audit({
    req: params.req,
    auth: params.auth,
    studioId: params.auth.studioId,
    action: "user.password_changed",
    entityType: "User",
    entityId: user.id,
  });

  return { message: "Password changed successfully." };
}

export async function getCurrentSessionCount(userId: string): Promise<number> {
  await requireDatabase();
  return SessionModel.countDocuments({
    userId,
    revokedAt: null,
    expiresAt: { $gt: new Date() },
  });
}
