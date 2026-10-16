import { Resend } from "resend";
import { escapeHtml } from "./http";

/**
 * Email delivery.
 *
 * Sending is best-effort by design: a notification failure must never roll
 * back an order or enquiry that has already been written. Every wrapper here
 * swallows and logs, and callers treat email as fire-and-forget.
 */

export type MailResult = { delivered: boolean; skipped?: boolean; error?: string };

export async function sendEmail(to: string, subject: string, html: string): Promise<MailResult> {
  if (!process.env.RESEND_API_KEY) {
    console.log("[email:skipped-no-api-key]", subject, "->", to || "(no recipient)");
    return { delivered: false, skipped: true };
  }
  if (!to) {
    console.log("[email:skipped-no-recipient]", subject);
    return { delivered: false, skipped: true };
  }
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const result: any = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev",
      to,
      subject,
      html,
    });
    if (result?.error) {
      console.error("[email:provider-error]", result.error);
      return { delivered: false, error: String(result.error?.message ?? "provider error") };
    }
    return { delivered: true };
  } catch (error) {
    console.error("[email:failed]", error);
    return { delivered: false, error: error instanceof Error ? error.message : "unknown error" };
  }
}

/** Never throws. Used after a record has been persisted. */
export async function notifyDistributor(subject: string, html: string): Promise<MailResult> {
  const to = process.env.DISTRIBUTOR_EMAIL || "";
  if (!to) {
    console.log("[email:skipped-no-distributor-address]", subject);
    return { delivered: false, skipped: true };
  }
  return sendEmail(to, subject, wrap(subject, html));
}

export async function notifyCustomer(to: string, subject: string, html: string): Promise<MailResult> {
  if (!to) return { delivered: false, skipped: true };
  return sendEmail(to, subject, wrap(subject, html));
}

/** Minimal, self-contained HTML shell so mail renders in any client. */
function wrap(heading: string, body: string): string {
  return `<!doctype html><html><body style="margin:0;padding:24px;background:#F3F6F8;font-family:'Segoe UI',Helvetica,Arial,sans-serif;color:#17212B">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#FFFFFF;border:1px solid #E3E8ED;border-radius:14px">
    <tr><td style="padding:20px 24px;border-bottom:1px solid #E3E8ED">
      <span style="font-weight:700;font-size:17px;color:#111827">Norgez</span>
      <span style="font-size:12px;color:#667085;letter-spacing:.08em;text-transform:uppercase;margin-left:8px">Industrial Supply</span>
    </td></tr>
    <tr><td style="padding:24px">
      <h1 style="margin:0 0 14px;font-size:19px;color:#111827">${escapeHtml(heading)}</h1>
      ${body}
    </td></tr>
    <tr><td style="padding:16px 24px;border-top:1px solid #E3E8ED;font-size:12px;color:#667085">
      This message was generated automatically by the Norgez operations platform.
    </td></tr>
  </table>
  </body></html>`;
}

export function emailRow(label: string, value: unknown): string {
  return `<tr><td style="padding:6px 0;font-size:13px;color:#667085;width:150px">${escapeHtml(label)}</td><td style="padding:6px 0;font-size:14px;color:#17212B;font-weight:600">${escapeHtml(value ?? "—")}</td></tr>`;
}

export function emailTable(rows: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:8px 0 4px">${rows}</table>`;
}
