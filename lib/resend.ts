import { Resend } from "resend";

export function getResendClient() {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is not set. Add it to .env.local to send transactional emails.");
  }
  return new Resend(process.env.RESEND_API_KEY);
}
