import { NextResponse } from "next/server";
import { verifyEmail } from "@/lib/auth";
import { handleError, parseBody } from "@/lib/api";
import { verifyEmailSchema } from "@/lib/validation";
import { checkRateLimit, rateLimitHeaders, rateLimitKey } from "@/lib/rate-limit";

export async function POST(req: Request) {
  try {
    const body = await parseBody(req, verifyEmailSchema);
    const limit = checkRateLimit(rateLimitKey(req, "verify-email"), 15, 15 * 60 * 1000);
    if (!limit.allowed) {
      return NextResponse.json(
        { success: false, error: "Too many attempts. Try again later.", code: "RATE_LIMITED" },
        { status: 429, headers: rateLimitHeaders(limit) }
      );
    }
    const result = await verifyEmail(body.token, req);
    return NextResponse.json(
      { success: true, ...result },
      { headers: rateLimitHeaders(limit) }
    );
  } catch (error) {
    return handleError(error);
  }
}
