const APP_URL =
  process.env.APP_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  "http://localhost:3000";

export function appUrl(path = ""): string {
  const base = APP_URL.replace(/\/$/, "");
  return path ? `${base}${path.startsWith("/") ? path : `/${path}`}` : base;
}

export function resetPasswordUrl(token: string): string {
  return appUrl(`/reset-password?token=${encodeURIComponent(token)}`);
}

export function verifyEmailUrl(token: string): string {
  return appUrl(`/verify-email?token=${encodeURIComponent(token)}`);
}

export function emailVerificationRequired(): boolean {
  return process.env.EMAIL_VERIFICATION_REQUIRED === "true";
}

export function exposeDevTokens(): boolean {
  return (
    process.env.EXPOSE_DEV_TOKENS === "true" ||
    (process.env.NODE_ENV !== "production" && process.env.EXPOSE_DEV_TOKENS !== "false")
  );
}

interface SendEmailParams {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

/**
 * Sends transactional email through Resend when configured.
 * Without an API key, messages are logged to the server console so local
 * development and automated tests remain fully functional.
 */
export async function sendEmail(params: SendEmailParams): Promise<{ sent: boolean; provider: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || "Photo Studio OS <noreply@photostudio.local>";

  if (!apiKey) {
    console.info(
      `[email:console] To: ${params.to}\nSubject: ${params.subject}\n${params.text}\n`
    );
    return { sent: false, provider: "console" };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [params.to],
        subject: params.subject,
        text: params.text,
        html: params.html || undefined,
      }),
    });

    if (!response.ok) {
      console.warn("[email] Resend rejected the message:", await response.text());
      return { sent: false, provider: "resend" };
    }
    return { sent: true, provider: "resend" };
  } catch (error) {
    console.warn("[email] Failed to send email:", error);
    return { sent: false, provider: "resend" };
  }
}

export async function sendPasswordResetEmail(to: string, name: string, token: string) {
  const url = resetPasswordUrl(token);
  return sendEmail({
    to,
    subject: "Reset your Photo Studio OS password",
    text: `Hi ${name},\n\nUse this link to reset your password. It expires in 1 hour:\n${url}\n\nIf you did not request this, you can safely ignore this email.`,
    html: `<p>Hi ${escapeHtml(name)},</p><p>Use the link below to reset your password. It expires in one hour.</p><p><a href="${url}">Reset password</a></p><p>If you did not request this, you can safely ignore this email.</p>`,
  });
}

export async function sendVerificationEmail(to: string, name: string, token: string) {
  const url = verifyEmailUrl(token);
  return sendEmail({
    to,
    subject: "Verify your Photo Studio OS email",
    text: `Hi ${name},\n\nConfirm your email address to activate your account:\n${url}\n\nThis link expires in 24 hours.`,
    html: `<p>Hi ${escapeHtml(name)},</p><p>Confirm your email address to activate your account.</p><p><a href="${url}">Verify email</a></p><p>This link expires in 24 hours.</p>`,
  });
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
