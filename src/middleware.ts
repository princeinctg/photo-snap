import { NextResponse, type NextRequest } from "next/server";
import { verifyEdgeSessionToken } from "@/lib/edge-jwt";

const SESSION_COOKIE_NAME = "photo_studio_session";

const PUBLIC_PAGES = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
];

const PUBLIC_API_PREFIXES = [
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/logout",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
  "/api/auth/verify-email",
  "/api/auth/resend-verification",
  "/api/health",
];

function getSecret(): string | null {
  return process.env.AUTH_SECRET || process.env.JWT_SECRET || null;
}

function isPublicPage(pathname: string): boolean {
  return (
    PUBLIC_PAGES.some((path) => pathname === path || pathname.startsWith(`${path}/`)) ||
    pathname.startsWith("/gallery/") ||
    pathname.startsWith("/invoice/")
  );
}

function isPublicApi(pathname: string, method: string): boolean {
  if (PUBLIC_API_PREFIXES.some((path) => pathname === path || pathname.startsWith(`${path}/`))) {
    return true;
  }

  // Public share links are read-only. Mutations still require authentication.
  if (method === "GET") {
    if (/^\/api\/galleries\/[^/]+$/.test(pathname)) return true;
    if (/^\/api\/invoices\/[^/]+$/.test(pathname)) return true;
  }

  return false;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (req.method === "OPTIONS") {
    return NextResponse.next();
  }

  const isApi = pathname.startsWith("/api/");
  if (isApi && isPublicApi(pathname, req.method)) {
    return NextResponse.next();
  }

  if (!isApi && isPublicPage(pathname)) {
    // Signed-in users should not see the auth screens.
    if (PUBLIC_PAGES.includes(pathname)) {
      const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
      const secret = getSecret();
      if (token && secret) {
        const payload = await verifyEdgeSessionToken(token, secret);
        if (payload) {
          return NextResponse.redirect(new URL("/", req.url));
        }
      }
    }
    return NextResponse.next();
  }

  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const secret = getSecret();
  const payload = token && secret ? await verifyEdgeSessionToken(token, secret) : null;

  if (!payload) {
    if (isApi) {
      return NextResponse.json(
        {
          success: false,
          error: "Authentication required. Please sign in.",
          code: "UNAUTHENTICATED",
        },
        { status: 401 }
      );
    }

    const loginUrl = new URL("/login", req.url);
    if (pathname !== "/") loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Run on all routes except Next internals, static files and uploads.
     */
    "/((?!_next/static|_next/image|favicon.ico|uploads/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|woff2?|ttf|otf)$).*)",
  ],
};
