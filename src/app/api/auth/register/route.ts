import { NextResponse } from "next/server";
import { registerUser } from "@/lib/auth";
import { handleError, parseBody } from "@/lib/api";
import { registerSchema } from "@/lib/validation";
import { checkRateLimit, rateLimitHeaders, rateLimitKey } from "@/lib/rate-limit";

export async function POST(req: Request) {
  try {
    const body = await parseBody(req, registerSchema);
    const limit = checkRateLimit(rateLimitKey(req, "register"), 8, 60 * 60 * 1000);

    if (!limit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: "Too many registration attempts. Please try again later.",
          code: "RATE_LIMITED",
        },
        { status: 429, headers: rateLimitHeaders(limit) }
      );
    }

    const result = await registerUser({
      name: body.name,
      email: body.email,
      password: body.password,
      phone: body.phone,
      studioName: body.studioName,
      req,
    });

    return NextResponse.json(
      {
        user: result.user,
        success: true,
        requiresVerification: result.requiresVerification || false,
        verificationToken: result.verificationToken,
        message: result.requiresVerification
          ? "Studio created. Check your email to verify your account before signing in."
          : "Studio workspace created successfully.",
      },
      { status: 201, headers: rateLimitHeaders(limit) }
    );
  } catch (error) {
    return handleError(error);
  }
}
