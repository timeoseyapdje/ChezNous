"use client";

import { useState } from "react";
import Image from "next/image";

type ChatMessage = { role: "user" | "assistant"; content: string };

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: "Bonjour, je suis Malik, l'assistant Chez Nous. Posez-moi vos questions sur les commandes, la vente ou la livraison." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history: nextMessages.slice(0, -1).map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.reply ?? data.error ?? "Une erreur est survenue." },
      ]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Connexion au chatbot impossible pour le moment." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-6 right-5 z-[65] flex h-14 w-14 items-center justify-center rounded-full bg-forest text-white shadow-lg hover:scale-105"
        aria-label="Discuter avec Malik"
      >
        <Image src="/assistant-avatar.svg" alt="" width={32} height={32} className="rounded-full" />
      </button>

      {open && (
        <div className="fixed bottom-24 right-5 z-[65] flex h-[500px] max-h-[70vh] w-[360px] max-w-[92vw] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
          <div className="flex items-center justify-between bg-ink p-4 text-white">
            <div className="flex items-center gap-2">
              <Image src="/assistant-avatar.svg" alt="" width={32} height={32} className="rounded-full" />
              <div>
                <div className="text-sm font-semibold leading-none">Malik</div>
                <div className="mt-0.5 text-[10px] opacity-60">Assistant Chez Nous</div>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="rounded-full bg-white/10 px-2 py-1 text-xs">
              Fermer
            </button>
          </div>
          <div className="flex-1 space-y-2 overflow-y-auto p-4">
            {messages.map((m, i) => (
              <div
                key={i}
                className={
                  m.role === "assistant"
                    ? "max-w-[82%] rounded-2xl rounded-bl-sm bg-sand px-3 py-2 text-sm"
                    : "ml-auto max-w-[82%] rounded-2xl rounded-br-sm bg-ink px-3 py-2 text-sm text-white"
                }
              >
                {m.content}
              </div>
            ))}
            {loading && <div className="text-xs opacity-50">Malik écrit...</div>}
          </div>
          <div className="flex gap-2 border-t border-line p-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Écrivez votre question..."
              className="flex-1 rounded-full border border-line px-4 py-2 text-sm outline-none"
            />
            <button onClick={send} className="shrink-0 rounded-full bg-forest px-4 py-2 text-sm text-white">
              Envoyer
            </button>
          </div>
        </div>
      )}
    </>
  );
}
