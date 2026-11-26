import { NextResponse } from "next/server";
import { resendVerificationEmail } from "@/lib/auth";
import { handleError, parseBody } from "@/lib/api";
import { resendVerificationSchema } from "@/lib/validation";
import { checkRateLimit, rateLimitHeaders, rateLimitKey } from "@/lib/rate-limit";

export async function POST(req: Request) {
  try {
    const body = await parseBody(req, resendVerificationSchema);
    const limit = checkRateLimit(
      rateLimitKey(req, "resend-verification", body.email),
      5,
      15 * 60 * 1000
    );
    if (!limit.allowed) {
      return NextResponse.json(
        { success: false, error: "Too many requests. Try again later.", code: "RATE_LIMITED" },
        { status: 429, headers: rateLimitHeaders(limit) }
      );
    }
    const result = await resendVerificationEmail(body.email);
    return NextResponse.json(
      { success: true, ...result },
      { headers: rateLimitHeaders(limit) }
    );
  } catch (error) {
    return handleError(error);
  }
}
