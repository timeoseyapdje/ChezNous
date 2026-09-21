const PROHIBITED_TERMS = [
  "merde", "putain", "connard", "conasse", "salope", "pute", "encul", "batard",
  "negre", "sale noir", "sale arabe", "arnaque garantie", "escroquerie",
];

export function containsProhibitedContent(text: string): boolean {
  const normalized = text.toLowerCase();
  return PROHIBITED_TERMS.some((term) => normalized.includes(term));
}

// For production, replace/augment this keyword filter with a real moderation
// pass (e.g. a Claude API call asking it to classify the text, or a dedicated
// moderation endpoint) before trusting user-submitted content.
