// Gemini service module - server-only.
// Isolated integration with Google's Gemini API via @google/genai.
// Existing Atlas AI flows continue to use the Lovable AI Gateway; this
// module exists so future sprints can opt specific features into Gemini
// without touching the rest of the app.
import { GoogleGenAI } from "@google/genai";

let _client: GoogleGenAI | undefined;

export function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Missing GEMINI_API_KEY. Add it as a secret to enable the Gemini integration.",
    );
  }
  if (!_client) {
    _client = new GoogleGenAI({ apiKey });
  }
  return _client;
}

export const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";

/**
 * Generate text from Gemini. Thin wrapper so callers don't need to know
 * about the underlying SDK shape.
 */
export async function generateGeminiText(
  prompt: string,
  options?: { model?: string; systemInstruction?: string },
): Promise<string> {
  const client = getGeminiClient();
  const response = await client.models.generateContent({
    model: options?.model ?? DEFAULT_GEMINI_MODEL,
    contents: prompt,
    ...(options?.systemInstruction
      ? { config: { systemInstruction: options.systemInstruction } }
      : {}),
  });
  return response.text ?? "";
}

/**
 * Lightweight connectivity check used by the test endpoint.
 */
export async function pingGemini(): Promise<{
  ok: boolean;
  model: string;
  reply: string;
}> {
  const reply = await generateGeminiText(
    "Reply with exactly the word: pong",
    { systemInstruction: "You are a health-check responder. Be terse." },
  );
  return { ok: true, model: DEFAULT_GEMINI_MODEL, reply: reply.trim() };
}