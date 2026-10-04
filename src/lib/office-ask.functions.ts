import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({
  question: z.string().trim().min(1).max(600),
  zone: z.string().max(60).optional(),
  history: z
    .array(z.object({ role: z.enum(["learner", "mentor"]), content: z.string().max(2000) }))
    .max(10)
    .optional(),
});

const OFFICE_CONTEXT = `OFFICE STATE (Ridgeway Group office relocation, Day 1 of Week 1):
- Waterfall project: 480 staff move to a new site on a fixed 12-week (84-day) deadline driven by the lease end.
- Project wall: overall status Green, 2 open risks, 1 open issue, next milestone Design Sign-off.
- Areas on the floor: Project Wall, Meeting Room (project meetings and Steering Committee later), Finance (budget baseline, commitments, cost changes), Project Manager Sarah Williams (wants to speak with the learner about an issue requiring investigation), Your Desk (inbox, tasks, documents), IT with James Lin, IT Lead (technical dependencies, IT readiness), Facilities (space planning, building works window, move vendor), HR (staff concerns, consultation and comms for the 480 staff).`;

export const askOfficeAtlas = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data }) => {
    const { generateGeminiText } = await import("./gemini.server");
    const { projectFactsPrompt } = await import("./project-facts");
    const system = `You are "Atlas", a calm senior project coach inside an immersive office for a learner project coordinator.
Answer questions about the Ridgeway office relocation project using ONLY the facts and office state given. Never invent figures, people or events.
Coach rather than do the work: explain, point to the right area/person in the office, suggest next steps. Do not draft full deliverables.
Keep answers to 1-2 short paragraphs or up to 5 bullets. No headings. Never mention AI, models or that this is a simulation.`;
    const hist = (data.history ?? [])
      .slice(-8)
      .map((t) => `${t.role === "learner" ? "Learner" : "Atlas"}: ${t.content}`)
      .join("\n");
    const prompt = `PROJECT FACTS (authoritative):
${projectFactsPrompt({ slug: "office-relocation" })}

${OFFICE_CONTEXT}
${data.zone ? `\nThe learner is currently looking at: ${data.zone}.` : ""}
${hist ? `\nCONVERSATION SO FAR:\n${hist}` : ""}

Learner asks: ${data.question}`;
    try {
      const answer = (await generateGeminiText(prompt, { systemInstruction: system })).trim();
      if (!answer) throw new Error("empty");
      return { ok: true as const, answer };
    } catch (e) {
      console.error("[office-ask] failed:", e instanceof Error ? e.message : e);
      return {
        ok: false as const,
        answer: "I couldn't answer just now. Try again in a moment — meanwhile, Sarah Williams at the Project Manager desk is the best first stop.",
      };
    }
  });
