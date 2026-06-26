import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { generateObject, generateText } from "ai";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";

const MODEL = "google/gemini-3-flash-preview";
function getModel() {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("Missing LOVABLE_API_KEY");
  return createLovableAiGatewayProvider(key)(MODEL);
}

/**
 * Route → workplace context. Used to anchor mentor responses so they are
 * specific to the screen the learner is on, not generic PM theory.
 */
const ROUTE_CONTEXT: Record<
  string,
  { area: string; what: string; concept: string }
> = {
  "/app": {
    area: "Dashboard",
    what: "Triage What's Next, then act on the most urgent stakeholder or task.",
    concept: "Daily coordination — scanning signals and choosing the next high-leverage move.",
  },
  "/app/inbox": {
    area: "Inbox",
    what: "Read the latest stakeholder messages, reply inline, and let new emails spawn tasks.",
    concept: "Stakeholder communication — listening for risks, decisions, and asks before they escalate.",
  },
  "/app/comms": {
    area: "Comms",
    what: "Send a proactive update or new email to a stakeholder.",
    concept: "Proactive communication — shaping perception instead of reacting.",
  },
  "/app/meetings": {
    area: "Meetings",
    what: "Run a live, multi-stakeholder conversation and capture minutes.",
    concept: "Facilitation — steering a room of differing agendas to a decision.",
  },
  "/app/stakeholders": {
    area: "Stakeholders",
    what: "Check sentiment, recover relationships, and read concerns per person.",
    concept: "Stakeholder management — sentiment is the leading indicator of project health.",
  },
  "/app/tasks": {
    area: "Tasks",
    what: "Pick the next task, do the work, submit it, then close it for review.",
    concept: "Task ownership — tasks (not emails) are how the project actually moves.",
  },
  "/app/completed": {
    area: "Completed work",
    what: "Review past submissions and the skills you've demonstrated.",
    concept: "Reflection — naming what you did so it becomes transferable experience.",
  },
  "/app/documents": {
    area: "Documents",
    what: "Draft and upload key project artefacts (charter, plan, register, report).",
    concept: "Project artefacts — the documented decisions that anchor delivery.",
  },
  "/app/reports": {
    area: "Status reports",
    what: "Write the weekly status with RAG, progress, risks, and asks.",
    concept: "Status reporting — honest RAG with one ask per sponsor.",
  },
  "/app/budget": {
    area: "Budget",
    what: "Track planned vs actual spend across budget lines.",
    concept: "Cost control — variance tells you where to look first.",
  },
  "/app/changes": {
    area: "Change requests",
    what: "Raise, assess and decide on scope/time/cost changes.",
    concept: "Change control — protect the baseline; route trade-offs to the sponsor.",
  },
  "/app/gates": {
    area: "Phase gates",
    what: "Check readiness and move the project to the next phase.",
    concept: "Stage gates — go/no-go decisions on evidence, not optimism.",
  },
  "/app/risk": {
    area: "Risk & RAG",
    what: "Log risks, assumptions, issues and dependencies; set workstream RAG.",
    concept: "RAID & RAG — making the invisible visible before it bites.",
  },
  "/app/progress": {
    area: "Progress",
    what: "Inspect milestones, velocity and what's blocking flow.",
    concept: "Schedule health — earned progress vs elapsed time.",
  },
  "/app/learning": {
    area: "Learning",
    what: "See competencies you've drafted and mastered through real work.",
    concept: "Experiential learning — skills tick when behaviours appear, not when read about.",
  },
  "/app/settings": {
    area: "Settings",
    what: "Adjust your profile, voice and project preferences.",
    concept: "Self-management — own your tooling.",
  },
};

function lookupRoute(route: string) {
  // Exact match first, else best prefix match
  if (ROUTE_CONTEXT[route]) return { route, ...ROUTE_CONTEXT[route] };
  const keys = Object.keys(ROUTE_CONTEXT).sort((a, b) => b.length - a.length);
  for (const k of keys) {
    if (route === k || route.startsWith(k + "/")) return { route: k, ...ROUTE_CONTEXT[k] };
  }
  return {
    route,
    area: "Atlas",
    what: "Work the simulation.",
    concept: "Project coordination.",
  };
}

/**
 * Mentor brief for the current screen. Returns Task / Learn / Hints,
 * optionally an Ask-AI answer when a question is supplied.
 */
export const mentorBrief = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { route: string; question?: string }) => input)
  .handler(async ({ data, context }) => {
    const ctx = lookupRoute(data.route);

    // Pull a tiny project snapshot to anchor advice
    const { supabase, userId } = context;
    const { data: profile } = await supabase
      .from("profiles")
      .select("current_project_instance_id, display_name")
      .eq("id", userId)
      .maybeSingle();
    const projectId = (profile as any)?.current_project_instance_id as string | undefined;

    let projectTitle = "your project";
    let phase: string | undefined;
    let unread = 0;
    let openTasks = 0;
    if (projectId) {
      const [{ data: p }, { count: u }, { count: t }] = await Promise.all([
        supabase
          .from("project_instances")
          .select("title, phase")
          .eq("id", projectId)
          .maybeSingle(),
        supabase
          .from("comms_messages")
          .select("id", { count: "exact", head: true })
          .eq("project_instance_id", projectId)
          .eq("direction", "in")
          .is("read_at", null),
        supabase
          .from("tasks")
          .select("id", { count: "exact", head: true })
          .eq("project_instance_id", projectId)
          .in("status", ["todo", "in_progress"]),
      ]);
      projectTitle = (p as any)?.title ?? projectTitle;
      phase = (p as any)?.phase;
      unread = u ?? 0;
      openTasks = t ?? 0;
    }

    const grounding = `Learner is on the "${ctx.area}" screen of Atlas, a workplace simulation.
Project: ${projectTitle}${phase ? ` (phase: ${phase})` : ""}.
Open tasks: ${openTasks}. Unread emails: ${unread}.
Screen purpose: ${ctx.what}
Underlying concept: ${ctx.concept}`;

    const Schema = z.object({
      task: z
        .string()
        .describe("One sentence: what to do on this screen right now."),
      learn: z
        .string()
        .describe("2-3 sentences explaining the concept behind this screen in plain English."),
      hints: z
        .array(z.string())
        .min(3)
        .max(3)
        .describe("3 short, specific hints. No fluff, no theory — each hint is an action."),
    });

    const { object: brief } = await generateObject({
      model: getModel(),
      schema: Schema,
      prompt: `${grounding}

Write a mentor brief for this screen. Speak directly to the learner ("you").
Avoid jargon. Be concrete to the current project state above.`,
    });

    let answer: string | undefined;
    if (data.question && data.question.trim().length > 2) {
      const { text } = await generateText({
        model: getModel(),
        prompt: `${grounding}

The learner asks: ${data.question.trim()}

Answer as a calm, senior PM mentor. 4-6 sentences max. Tie the answer to the
current screen and project state where relevant. No bullet headers.`,
      });
      answer = text.trim();
    }

    return { ctx, brief, answer };
  });