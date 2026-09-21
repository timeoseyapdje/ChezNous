import { NextRequest, NextResponse } from "next/server";
import { getAnthropicClient, MALIK_SYSTEM_PROMPT } from "@/lib/anthropic";
import { containsProhibitedContent } from "@/lib/moderation";

export async function POST(req: NextRequest) {
  const { message, history } = await req.json();

  if (typeof message !== "string" || !message.trim()) {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }

  if (containsProhibitedContent(message)) {
    return NextResponse.json({
      reply: "Merci de rester respectueux, ce message ne peut pas etre traite. Consultez notre charte de la communaute.",
    });
  }

  try {
    const anthropic = getAnthropicClient();
    const response = await anthropic.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 400,
      system: MALIK_SYSTEM_PROMPT,
      messages: [
        ...(Array.isArray(history) ? history : []),
        { role: "user", content: message },
      ],
    });

    const reply = response.content
      .filter((block) => block.type === "text")
      .map((block) => ("text" in block ? block.text : ""))
      .join("\n");

    return NextResponse.json({ reply });
  } catch (err) {
    console.error("chat route error:", err);
    return NextResponse.json(
      { error: "Le chatbot n'est pas configure. Ajoutez ANTHROPIC_API_KEY dans .env.local." },
      { status: 503 }
    );
  }
}
