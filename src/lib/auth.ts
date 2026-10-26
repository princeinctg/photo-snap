import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import type { User } from "@/types";
import { DEFAULT_STUDIO_ID } from "./demo-data";

const JWT_SECRET = process.env.AUTH_SECRET || "photo_studio_os_master_secret_key_1234567890_jwt";
const TOKEN_COOKIE_NAME = "photo_studio_session";

export interface SessionPayload {
  userId: string;
  email: string;
  name: string;
  role: string;
  studioId: string;
}

export async function hashPassword(plainText: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plainText, salt);
}

export async function comparePassword(plainText: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plainText, hash);
}

export function signSessionToken(payload: SessionPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifySessionToken(token: string): SessionPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as SessionPayload;
  } catch {
    return null;
  }
}

export function setSessionCookie(payload: SessionPayload) {
  const token = signSessionToken(payload);
  const cookieStore = cookies();
  cookieStore.set(TOKEN_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60, // 7 days
    path: "/",
  });
}

export function removeSessionCookie() {
  const cookieStore = cookies();
  cookieStore.delete(TOKEN_COOKIE_NAME);
}

export function getSessionUser(): SessionPayload | null {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(TOKEN_COOKIE_NAME)?.value;
    if (!token) return null;
    return verifySessionToken(token);
  } catch {
    return null;
  }
}

// Default initial admin user for demo or first-time setup
export const defaultAdminUser: User = {
  id: "user_owner_001",
  name: "Studio Principal / Owner",
  email: process.env.INITIAL_ADMIN_EMAIL || "owner@photostudio.com",
  role: "owner",
  studioId: DEFAULT_STUDIO_ID,
  avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
  createdAt: new Date().toISOString(),
};
