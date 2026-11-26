import { NextResponse } from "next/server";
import { forgotPassword } from "@/lib/auth";
import { handleError, parseBody } from "@/lib/api";
import { forgotPasswordSchema } from "@/lib/validation";
import { checkRateLimit, rateLimitHeaders, rateLimitKey } from "@/lib/rate-limit";

export async function POST(req: Request) {
  try {
    const body = await parseBody(req, forgotPasswordSchema);
    const limit = checkRateLimit(
      rateLimitKey(req, "forgot-password", body.email),
      5,
      15 * 60 * 1000
    );

    if (!limit.allowed) {
      return NextResponse.json(
        { success: false, error: "Too many reset requests. Try again later.", code: "RATE_LIMITED" },
        { status: 429, headers: rateLimitHeaders(limit) }
      );
    }

    const result = await forgotPassword(body.email, req);
    return NextResponse.json(
      { success: true, ...result },
      { headers: rateLimitHeaders(limit) }
    );
  } catch (error) {
    return handleError(error);
  }
}
