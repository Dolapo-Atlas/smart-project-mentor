import { createFileRoute } from "@tanstack/react-router";

/**
 * Test endpoint to confirm Atlas can reach Google Gemini.
 * GET  /api/public/gemini-test              -> ping ("pong")
 * POST /api/public/gemini-test { "prompt" } -> custom prompt
 *
 * Intentionally public and minimal — infrastructure smoke test only.
 */
export const Route = createFileRoute("/api/public/gemini-test")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const { pingGemini } = await import("@/lib/gemini.server");
          const result = await pingGemini();
          return Response.json(result);
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Unknown Gemini error";
          return Response.json({ ok: false, error: message }, { status: 500 });
        }
      },
      POST: async ({ request }) => {
        let body: { prompt?: string } = {};
        try {
          body = await request.json();
        } catch {
          // empty body is fine — falls back to ping
        }
        try {
          const { generateGeminiText, pingGemini, DEFAULT_GEMINI_MODEL } =
            await import("@/lib/gemini.server");
          if (body.prompt && body.prompt.trim().length > 0) {
            const reply = await generateGeminiText(body.prompt.trim());
            return Response.json({
              ok: true,
              model: DEFAULT_GEMINI_MODEL,
              reply,
            });
          }
          const result = await pingGemini();
          return Response.json(result);
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Unknown Gemini error";
          return Response.json({ ok: false, error: message }, { status: 500 });
        }
      },
    },
  },
});