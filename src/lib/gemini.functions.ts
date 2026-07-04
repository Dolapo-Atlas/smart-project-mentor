import { createServerFn } from "@tanstack/react-start";

/**
 * Test server function to confirm Atlas can successfully call Gemini.
 * Isolated from existing simulation logic — safe to call from anywhere,
 * safe to remove once Gemini is wired into real features.
 */
export const testGemini = createServerFn({ method: "POST" })
  .inputValidator((input: { prompt?: string } | undefined) => input ?? {})
  .handler(async ({ data }) => {
    const { pingGemini, generateGeminiText, DEFAULT_GEMINI_MODEL } =
      await import("./gemini.server");
    try {
      if (data.prompt && data.prompt.trim().length > 0) {
        const reply = await generateGeminiText(data.prompt.trim());
        return { ok: true as const, model: DEFAULT_GEMINI_MODEL, reply };
      }
      const result = await pingGemini();
      return { ...result, ok: true as const };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown Gemini error";
      console.error("[gemini.test] failed:", message);
      return { ok: false as const, error: message };
    }
  });