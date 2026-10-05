import { Resend } from "resend";
import { config } from "@/config";

export async function sendWaitlistConfirmation(email: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY is not configured");
  const resend = new Resend(apiKey);
  const result = await resend.emails.send({
    from: config.email.from,
    to: email,
    subject: "You’re on the waitlist",
    html: "<p>Thanks for joining the waitlist. We’ll be in touch soon.</p>",
  });
  if (result.error) throw new Error(result.error.message);
}
