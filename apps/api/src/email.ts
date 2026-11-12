import { env } from "./config.js";

export async function sendPasswordResetEmail(email: string, resetUrl: string) {
  if (!env.RESEND_API_KEY || !env.EMAIL_FROM) {
    if (env.NODE_ENV === "development") {
      console.info(`Password reset link (development only): ${resetUrl}`);
      return;
    }
    throw new Error("Password reset email is not configured");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: env.EMAIL_FROM,
      to: [email],
      subject: "Reset your Daily Ledger password",
      text: `Use this one-time link to reset your Daily Ledger password. It expires in 30 minutes.\n\n${resetUrl}\n\nIf you did not request this, you can ignore this email.`,
      html: `<p>Use this one-time link to reset your Daily Ledger password. It expires in 30 minutes.</p><p><a href="${resetUrl}">Reset password</a></p><p>If you did not request this, you can ignore this email.</p>`
    })
  });

  if (!response.ok) throw new Error(`Password reset email provider returned ${response.status}`);
}
