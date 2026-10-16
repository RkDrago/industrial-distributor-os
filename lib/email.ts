import { Resend } from "resend";
export async function sendEmail(to:string, subject:string, html:string) {
  if (!process.env.RESEND_API_KEY || !to) { console.log("[email mock]",subject,html); return; }
  const resend = new Resend(process.env.RESEND_API_KEY);
  await resend.emails.send({from:process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev",to,subject,html});
}