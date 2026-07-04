import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { generateObject, generateText } from "ai";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";
import {
  generateMentorAnswer,
  isMentorAIAvailable,
  type MentorContext,
  type MentorTurn,
} from "./mentor-ai.server";

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
  "/app/raid": {
    area: "RAID Log",
    what: "Maintain the project's RAID register — Risks, Assumptions, Issues and Dependencies.",
    concept: "RAID — surface the invisible before it bites, with owners and target dates.",
  },
  "/app/health": {
    area: "Project Health (RAG)",
    what: "Set the Overall, Scope, Schedule, Budget, Resources, Quality and Benefits RAG status with rationale and trend.",
    concept: "RAG reporting — a Sponsor/Steering view of where the project stands and where it's heading.",
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
 * Gather a rich, read-only snapshot of the learner's current simulation.
 * Everything is scoped to their active project instance via RLS.
 */
async function loadMentorContext(
  supabase: any,
  userId: string,
  route: string,
): Promise<MentorContext | null> {
  const screenRaw = lookupRoute(route);
  const screen = {
    route: screenRaw.route,
    area: screenRaw.area,
    purpose: screenRaw.what,
    concept: screenRaw.concept,
  };

  const { data: profile } = await supabase
    .from("profiles")
    .select("current_project_instance_id, display_name")
    .eq("id", userId)
    .maybeSingle();
  const projectId = profile?.current_project_instance_id as string | undefined;
  if (!projectId) return null;

  const [
    { data: project },
    { count: unread },
    { count: openTasks },
    { data: stakeholders },
    { data: tasks },
    { data: raid },
    { data: comms },
    { data: recentTasks },
  ] = await Promise.all([
    supabase
      .from("project_instances")
      .select("display_name, current_phase, progress_pct, status")
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
    supabase
      .from("stakeholder_relationships")
      .select("stakeholder_name, role, sentiment, concerns")
      .eq("project_instance_id", projectId)
      .order("last_interaction", { ascending: false })
      .limit(8),
    supabase
      .from("tasks")
      .select("title, status, priority, due_at")
      .eq("project_instance_id", projectId)
      .in("status", ["todo", "in_progress"])
      .order("due_at", { ascending: true, nullsFirst: false })
      .limit(8),
    supabase
      .from("raid_items")
      .select("kind, title, severity, status, owner")
      .eq("project_instance_id", projectId)
      .neq("status", "closed")
      .order("updated_at", { ascending: false })
      .limit(8),
    supabase
      .from("comms_messages")
      .select("direction, sender_name, subject, body, created_at")
      .eq("project_instance_id", projectId)
      .order("created_at", { ascending: false })
      .limit(6),
    supabase
      .from("tasks")
      .select("title, submission, completion_action, completed_at")
      .eq("project_instance_id", projectId)
      .eq("status", "completed")
      .order("completed_at", { ascending: false })
      .limit(5),
  ]);

  const proj = (project ?? {}) as {
    display_name?: string | null;
    current_phase?: string | null;
    progress_pct?: number | null;
    status?: string | null;
  };

  return {
    learnerName: profile?.display_name ?? undefined,
    screen,
    project: {
      name: proj.display_name ?? "your project",
      phase: proj.current_phase ?? null,
      progressPct: proj.progress_pct ?? null,
      status: proj.status ?? null,
    },
    counts: { openTasks: openTasks ?? 0, unreadInbox: unread ?? 0 },
    stakeholders: (stakeholders ?? []).map((s: any) => ({
      name: s.stakeholder_name,
      role: s.role,
      sentiment: s.sentiment ?? 50,
      concerns: Array.isArray(s.concerns) ? s.concerns : [],
    })),
    tasks: (tasks ?? []).map((t: any) => ({
      title: t.title,
      status: t.status,
      priority: t.priority,
      due_at: t.due_at,
    })),
    raid: (raid ?? []).map((r: any) => ({
      kind: r.kind,
      title: r.title,
      severity: r.severity,
      status: r.status,
      owner: r.owner,
    })),
    recentComms: (comms ?? []).map((m: any) => ({
      direction: m.direction,
      from: m.sender_name ?? "unknown",
      subject: m.subject ?? "(no subject)",
      snippet: String(m.body ?? "").replace(/\s+/g, " ").slice(0, 140),
    })),
    recentDecisions: (recentTasks ?? [])
      .filter((t: any) => t.completion_action)
      .map((t: any) => `${t.title} → ${String(t.completion_action).slice(0, 80)}`),
    recentEvidence: (recentTasks ?? [])
      .filter((t: any) => t.submission)
      .map((t: any) => `${t.title}: ${String(t.submission).replace(/\s+/g, " ").slice(0, 120)}`),
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
      const question = data.question.trim();

      // Prefer Gemini-powered mentor when configured; fall back to gateway.
      if (isMentorAIAvailable()) {
        try {
          const mentorCtx = await loadMentorContext(supabase, userId, data.route);
          if (mentorCtx) {
            answer = await generateMentorAnswer({ context: mentorCtx, question });
          }
        } catch (err) {
          console.warn("[mentor] Gemini path failed, falling back to gateway", err);
        }
      }

      if (!answer) {
        const { text } = await generateText({
          model: getModel(),
          prompt: `${grounding}

The learner asks: ${question}

Answer as a calm, senior PM mentor. 4-6 sentences max. Coach — never write
the learner's deliverables (emails, reports, RAID entries) for them. Tie the
answer to the current screen and project state.`,
        });
        answer = text.trim();
      }
    }

    return { ctx, brief, answer };
  });

/**
 * Multi-turn mentor chat. Same context grounding as `mentorBrief`, but
 * accepts prior turns so the learner can have a real conversation.
 * Falls back to the Lovable AI gateway when Gemini is unavailable so the
 * simulation never breaks.
 */
const MentorTurnSchema = z.object({
  role: z.enum(["learner", "mentor"]),
  content: z.string(),
});

export const mentorChat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      route: string;
      question: string;
      history?: MentorTurn[];
    }) => ({
      route: z.string().parse(input.route),
      question: z.string().min(1).max(2000).parse(input.question),
      history: z.array(MentorTurnSchema).max(20).optional().parse(input.history),
    }),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const question = data.question.trim();

    if (isMentorAIAvailable()) {
      try {
        const mentorCtx = await loadMentorContext(supabase, userId, data.route);
        if (mentorCtx) {
          const answer = await generateMentorAnswer({
            context: mentorCtx,
            question,
            history: data.history ?? [],
          });
          return { answer, source: "gemini" as const };
        }
      } catch (err) {
        console.warn("[mentorChat] Gemini failed, falling back", err);
      }
    }

    const screen = lookupRoute(data.route);
    const historyText = (data.history ?? [])
      .slice(-8)
      .map((t) => `${t.role === "learner" ? "Learner" : "Mentor"}: ${t.content}`)
      .join("\n");
    const { text } = await generateText({
      model: getModel(),
      prompt: `You are Atlas Mentor — a calm, senior PM coach. Coach, do not write the learner's deliverables.
Screen: ${screen.area} — ${screen.what}
Concept: ${screen.concept}
${historyText ? `\nConversation so far:\n${historyText}\n` : ""}
Learner: ${question}

Respond in 4-6 sentences or up to 5 bullets. Refuse to draft full emails or reports; instead coach on structure, audience and pitfalls.`,
    });
    return { answer: text.trim(), source: "gateway" as const };
  });