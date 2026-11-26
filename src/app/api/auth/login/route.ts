import { NextResponse } from "next/server";
import { loginUser } from "@/lib/auth";
import { handleError, parseBody } from "@/lib/api";
import { loginSchema } from "@/lib/validation";
import { checkRateLimit, rateLimitHeaders, rateLimitKey } from "@/lib/rate-limit";

export async function POST(req: Request) {
  try {
    const body = await parseBody(req, loginSchema);
    const key = rateLimitKey(req, "login", body.email);
    const limit = checkRateLimit(key, 10, 15 * 60 * 1000);

    if (!limit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: "Too many sign-in attempts. Please wait a few minutes and try again.",
          code: "RATE_LIMITED",
        },
        { status: 429, headers: rateLimitHeaders(limit) }
      );
    }

    const { user } = await loginUser({
      email: body.email,
      password: body.password,
      rememberMe: body.rememberMe,
      req,
    });

    return NextResponse.json(
      { user, success: true },
      { status: 200, headers: rateLimitHeaders(limit) }
    );
  } catch (error) {
    return handleError(error);
  }
}
