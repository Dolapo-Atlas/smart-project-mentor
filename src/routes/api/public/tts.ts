import { createFileRoute } from "@tanstack/react-router";

const ALLOWED_VOICES = new Set([
  "alloy", "ash", "ballad", "coral", "echo",
  "sage", "shimmer", "verse", "marin", "cedar",
]);

export const Route = createFileRoute("/api/public/tts")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env.LOVABLE_API_KEY;
        if (!apiKey) {
          return new Response("TTS not configured", { status: 500 });
        }
        let payload: { text?: string; voice?: string; speed?: number; instructions?: string };
        try {
          payload = await request.json();
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }
        const text = (payload.text ?? "").trim();
        const voice = ALLOWED_VOICES.has(payload.voice ?? "")
          ? payload.voice!
          : "alloy";
        const speed = Math.min(2.0, Math.max(0.5, Number(payload.speed) || 1.0));
        const instructionsRaw = (payload as { instructions?: unknown }).instructions;
        const instructions =
          typeof instructionsRaw === "string" && instructionsRaw.trim()
            ? instructionsRaw.trim().slice(0, 500)
            : undefined;
        if (!text) return new Response("Missing text", { status: 400 });
        if (text.length > 4000) {
          return new Response("Text too long", { status: 400 });
        }

        const upstream = await fetch(
          "https://ai.gateway.lovable.dev/v1/audio/speech",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "openai/gpt-4o-mini-tts",
              input: text,
              voice,
              response_format: "mp3",
              speed,
              ...(instructions ? { instructions } : {}),
            }),
          },
        );
        if (!upstream.ok) {
          const msg = await upstream.text().catch(() => "");
          return new Response(`TTS failed: ${msg || upstream.status}`, {
            status: upstream.status,
          });
        }
        return new Response(upstream.body, {
          headers: {
            "Content-Type": "audio/mpeg",
            "Cache-Control": "no-store",
          },
        });
      },
    },
  },
});