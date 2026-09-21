import { NextRequest, NextResponse } from "next/server";
import { getResendClient } from "@/lib/resend";
import { containsProhibitedContent } from "@/lib/moderation";

export async function POST(req: NextRequest) {
  const { name, email, subject, message } = await req.json();

  if (!name || !email || !message) {
    return NextResponse.json({ error: "name, email and message are required" }, { status: 400 });
  }

  if (containsProhibitedContent(message)) {
    return NextResponse.json(
      { error: "Votre message contient des termes non autorises par notre charte de la communaute." },
      { status: 422 }
    );
  }

  try {
    const resend = getResendClient();
    await resend.emails.send({
      from: process.env.EMAIL_FROM ?? "aide@cheznous.ca",
      to: "aide@cheznous.ca",
      replyTo: email,
      subject: `[Contact] ${subject ?? "Nouvelle demande"} - ${name}`,
      text: message,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("contact route error:", err);
    return NextResponse.json(
      { error: "Resend n'est pas configure. Ajoutez RESEND_API_KEY dans .env.local." },
      { status: 503 }
    );
  }
}
