import Anthropic from "@anthropic-ai/sdk";

export function getAnthropicClient() {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not set. Add it to .env.local to enable the chatbot.");
  }
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

export const MALIK_SYSTEM_PROMPT = `Tu es Malik, l'assistant de Chez Nous, une marketplace pour la diaspora
africaine au Canada. Tu aides les acheteurs a trouver des produits et services, expliques le
fonctionnement des commandes, de la livraison, des paiements Stripe et des formules vendeur.
Reste bref, chaleureux et precis. Refuse poliment tout contenu haineux, discriminatoire ou hors
charte de la communaute.`;
