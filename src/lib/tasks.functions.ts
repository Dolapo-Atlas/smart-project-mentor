import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { generateObject } from "ai";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";
import { ARCHETYPE_SENTIMENT, getProjectCtx } from "./pm.functions";
import { loadRoster, rosterByRole, DEFAULT_ROSTER } from "./roster";
import { decodeSubmission, payloadToNarrative, TEMPLATES } from "./templates";

const MODEL = "google/gemini-3-flash-preview";
function getModel() {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("Missing LOVABLE_API_KEY");
  return createLovableAiGatewayProvider(key)(MODEL);
}

export const TASK_CATEGORIES = [
  "Documentation",
  "RAID / Risk",
  "Budget / Cost",
  "Stakeholder",
  "Meetings",
  "Governance",
  "Vendor",
  "Reporting",
  "Comms",
  "Decision",
] as const;

const LINKED_AREAS = [
  "budget",
  "risk",
  "documents",
  "meetings",
  "gates",
  "comms",
  "charter",
  "vendors",
  "stakeholders",
  "reports",
  "changes",
] as const;

const AREA_TO_ROUTE: Record<string, string> = {
  budget: "/app/budget",
  risk: "/app/raid",
  documents: "/app/documents",
  meetings: "/app/meetings",
  gates: "/app/gates",
  comms: "/app/comms",
  charter: "/app/charter",
  vendors: "/app/comms",
  stakeholders: "/app/stakeholders",
  reports: "/app/reports",
  changes: "/app/changes",
};

// Some tasks (esp. AI-generated or older seeded rows) were stored with a
// generic linked_area like "documents" even when the deliverable clearly
// belongs in a dedicated module (Charter, RAID, Reports, etc.). Rather than
// backfilling the DB, we infer the correct destination from the task's own
// title/description at read time. This keeps existing rows intact and lets
// the dashboard "Start task" button open the right working module.
function inferModuleRoute<T extends { title?: string | null; description?: string | null; linked_module_route?: string | null; linked_area?: string | null }>(
  t: T,
): string | null {
  const text = `${t.title ?? ""} ${t.description ?? ""}`.toLowerCase();
  const rules: Array<[RegExp, string]> = [
    [/\bproject charter\b|\bcharter\b/, "/app/charter"],
    [/\bstakeholder register\b|\bstakeholder map|\bstakeholders?\b/, "/app/stakeholders"],
    [/\braid\b|\brisk log\b|risks?, ?assumption/, "/app/raid"],
    [/\bchange request\b|\bcr\b/, "/app/changes"],
    [/\bstatus report\b|\bweekly (?:status|report)\b/, "/app/reports"],
    [/\blessons learned\b|\bretrospective\b|\bpost[- ]?mortem\b/, "/app/lessons"],
    [/\bmeeting\b|\bagenda\b|\bminutes\b/, "/app/meetings"],
    [/\bbudget\b|\bforecast\b|\bspend\b/, "/app/budget"],
    [/\bresource plan\b/, "/app/documents"],
  ];
  for (const [re, route] of rules) if (re.test(text)) return route;
  return t.linked_module_route ?? (t.linked_area ? AREA_TO_ROUTE[t.linked_area] ?? null : null);
}

const ImpactSchema = z
  .object({
    health: z.number().int().min(-2).max(2).optional(),
    reputation: z.number().int().min(-10).max(10).optional(),
    progress: z.number().int().min(-10).max(10).optional(),
    budget_confidence: z.number().int().min(-10).max(10).optional(),
    timeline_risk: z.number().int().min(-10).max(10).optional(),
    sentiment: z.record(z.string(), z.number().int().min(-30).max(30)).optional(),
  })
  .default({});
type Impact = z.infer<typeof ImpactSchema>;

const TaskSpecSchema = z.object({
  title: z.string().min(3).max(120),
  description: z.string().min(5).max(600),
  category: z.enum(TASK_CATEGORIES),
  linked_area: z.enum(LINKED_AREAS),
  linked_stakeholder: z.string().max(80).optional(),
  completion_action: z.string().max(200),
  priority: z.enum(["low", "medium", "high", "critical"]),
  impact: ImpactSchema,
});
const TaskBatchSchema = z.object({
  tasks: z.array(TaskSpecSchema).min(1).max(5),
});
type TaskSpec = z.infer<typeof TaskSpecSchema>;

/* ---------- LIST WITH BLOCKED COMPUTATION ---------- */

export const listTasksRich = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("tasks")
      .select("*")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    const all = data ?? [];
    const byId = new Map(all.map((t) => [t.id, t]));
    return all.map((t) => {
      const deps = (t.depends_on ?? []) as string[];
      const blockedBy = deps
        .map((id) => byId.get(id))
        .filter((d) => d && !["done", "approved", "completed", "closed"].includes(d.status))
        .map((d) => ({ id: d!.id, title: d!.title }));
      return { ...t, blocked_by: blockedBy, linked_module_route: inferModuleRoute(t) };
    });
  });

/* ---------- WHAT'S NEXT (top 3 ready tasks) ---------- */

const PRIORITY_RANK: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };

export const listWhatsNext = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("tasks")
      .select("id,title,priority,status,due_at,linked_area,linked_module_route,linked_stakeholder,completion_action,depends_on,category")
      .eq("user_id", context.userId)
      .in("status", ["todo", "in_progress", "blocked"]);
    const all = data ?? [];
    const doneSet = new Set(
      (await context.supabase
        .from("tasks")
        .select("id,status")
        .eq("user_id", context.userId)
        .in("status", ["done", "approved", "completed", "closed"])).data?.map((t) => t.id) ?? [],
    );
    const ready = all
      .filter((t) => ((t.depends_on ?? []) as string[]).every((id) => doneSet.has(id)))
      .sort((a, b) => {
        const pr = (PRIORITY_RANK[b.priority] ?? 0) - (PRIORITY_RANK[a.priority] ?? 0);
        if (pr !== 0) return pr;
        const ad = a.due_at ? +new Date(a.due_at) : Infinity;
        const bd = b.due_at ? +new Date(b.due_at) : Infinity;
        return ad - bd;
      })
      .slice(0, 3);
    const readyRouted = ready.map((t) => ({ ...t, linked_module_route: inferModuleRoute(t) }));
    const criticalOverdue = all.some(
      (t) => t.priority === "critical" && t.due_at && +new Date(t.due_at) < Date.now() && t.status !== "done",
    );
    return { tasks: readyRouted, criticalOverdue };
  });

/* ---------- CREATE / UPDATE / SUBMIT / CLOSE ---------- */

export const createRichTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        title: z.string().min(1),
        description: z.string().optional(),
        priority: z.enum(["low", "medium", "high", "critical"]).default("medium"),
        category: z.string().optional(),
        linked_area: z.string().optional(),
        linked_stakeholder: z.string().optional(),
        completion_action: z.string().optional(),
        due_at: z.string().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const route = data.linked_area ? AREA_TO_ROUTE[data.linked_area] ?? null : null;
    const { data: t, error } = await context.supabase
      .from("tasks")
      .insert({
        user_id: context.userId,
        title: data.title,
        description: data.description ?? null,
        priority: data.priority,
        category: data.category ?? null,
        linked_area: data.linked_area ?? null,
        linked_stakeholder: data.linked_stakeholder ?? null,
        linked_module_route: route,
        completion_action: data.completion_action ?? null,
        due_at: data.due_at ?? null,
        source: "manual",
      })
      .select()
      .single();
    if (error) throw error;
    return t;
  });

export const submitTaskWithWork = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        // Length cap covers both free-text and encoded template payloads
        // (JSON string produced by src/lib/templates.ts:encodeSubmission).
        submission: z.string().min(5).max(20000),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // Check dependencies
    const { data: task } = await supabase
      .from("tasks")
      .select("*")
      .eq("id", data.id)
      .eq("user_id", userId)
      .maybeSingle();
    if (!task) throw new Error("Task not found");
    const deps = (task.depends_on ?? []) as string[];
    if (deps.length > 0) {
      const { data: depRows } = await supabase
        .from("tasks")
        .select("id,title,status")
        .in("id", deps)
        .eq("user_id", userId);
      const unmet = (depRows ?? []).filter((d) => !["done", "approved"].includes(d.status));
      if (unmet.length > 0) {
        throw new Error(
          `Blocked by: ${unmet.map((d) => d.title).join(", ")}. Complete these first.`,
        );
      }
    }
    await supabase
      .from("tasks")
      .update({ status: "submitted", submission: data.submission, submitted_at: new Date().toISOString() })
      .eq("id", data.id)
      .eq("user_id", userId);
    // Chapter trigger: submitting the Project Charter task closes chapter 3.
    try {
      const title = String((task as any)?.title ?? "");
      if (/charter/i.test(title)) {
        const { tickChapterBySlug } = await import("@/lib/chapters.functions");
        await tickChapterBySlug(supabase, userId, "charter");
      }
    } catch (e) {
      console.error("chapter tick (charter) failed", e);
    }
    return { ok: true };
  });

async function applyImpact(
  supabase: any,
  userId: string,
  impact: Impact,
): Promise<{ summary: string[] }> {
  const summary: string[] = [];
  const { data: state } = await supabase
    .from("simulation_state")
    .select("health,reputation,progress")
    .eq("user_id", userId)
    .maybeSingle();
  if (!state) return { summary };
  const HEALTH_ORDER = ["red", "amber", "green"];
  const patch: Record<string, any> = { updated_at: new Date().toISOString() };
  if (impact.health) {
    const cur = HEALTH_ORDER.indexOf(state.health ?? "amber");
    const next = Math.max(0, Math.min(2, cur + impact.health));
    if (next !== cur) {
      patch.health = HEALTH_ORDER[next];
      summary.push(`Project health ${state.health} → ${patch.health}`);
    }
  }
  if (impact.reputation) {
    patch.reputation = Math.max(0, Math.min(100, (state.reputation ?? 50) + impact.reputation));
    summary.push(`Reputation ${impact.reputation > 0 ? "+" : ""}${impact.reputation}`);
  }
  if (impact.progress) {
    patch.progress = Math.max(0, Math.min(100, (state.progress ?? 0) + impact.progress));
    summary.push(`Progress ${impact.progress > 0 ? "+" : ""}${impact.progress}`);
  }
  if (Object.keys(patch).length > 1) {
    await supabase.from("simulation_state").update(patch).eq("user_id", userId);
  }
  if (impact.sentiment) {
    for (const [name, delta] of Object.entries(impact.sentiment)) {
      const { data: existing } = await supabase
        .from("stakeholder_relationships")
        .select("sentiment,interaction_count,role")
        .eq("user_id", userId)
        .eq("stakeholder_name", name)
        .maybeSingle();
      const baseline = ARCHETYPE_SENTIMENT[name] ?? 0;
      const cur = existing?.sentiment ?? baseline;
      const next = Math.max(-100, Math.min(100, cur + delta));
      await supabase.from("stakeholder_relationships").upsert(
        {
          user_id: userId,
          stakeholder_name: name,
          sentiment: next,
          interaction_count: (existing?.interaction_count ?? 0) + 1,
          last_interaction: new Date().toISOString(),
          role: existing?.role ?? null,
        },
        { onConflict: "user_id,project_instance_id,stakeholder_name" },
      );
      summary.push(`${name} ${delta > 0 ? "+" : ""}${delta}`);
    }
  }
  return { summary };
}

const FeedbackSchema = z.object({
  score: z.number().int().min(1).max(5),
  did_well: z.string().min(5).max(400),
  improve: z.string().min(5).max(400),
  real_world: z.string().min(5).max(400),
  skill: z.string().max(80),
});

export const closeTaskWithReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        decision: z.enum(["approved", "rework"]).default("approved"),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: task } = await supabase
      .from("tasks")
      .select("*")
      .eq("id", data.id)
      .eq("user_id", userId)
      .maybeSingle();
    if (!task) throw new Error("Task not found");

    if (data.decision === "rework") {
      await supabase
        .from("tasks")
        .update({ status: "in_progress" })
        .eq("id", data.id)
        .eq("user_id", userId);
      return { ok: true, decision: "rework" as const };
    }

    // Generate feedback
    let feedback: z.infer<typeof FeedbackSchema> | null = null;
    try {
      const payload = decodeSubmission(task.submission ?? null);
      const templateLabel = payload && payload.kind !== "free_text" && payload.template
        ? TEMPLATES[payload.template].label
        : "free-form submission";
      const submissionForAi = payload
        ? payloadToNarrative(payload, templateLabel)
        : task.submission ?? "(no detail provided)";
      const readinessLine = payload && payload.kind !== "free_text"
        ? `\nAtlas readiness (rules): ${payload.readiness.score}/100 (${payload.readiness.status})${
            payload.ai_readiness ? ` · AI review: ${payload.ai_readiness.score}/100` : ""
          }`
        : "";
      const prompt = `You are a Project Management mentor reviewing a Project Coordinator's submission.
Task: ${task.title}
Category: ${task.category ?? "general"}
What good looks like: ${task.completion_action ?? "Complete the action thoroughly."}${readinessLine}
Submission:
${submissionForAi}

Return strict JSON. Be specific and tied to the submission. Skill = the project-coordinator competency demonstrated (e.g. "Governance documentation", "RAID management", "Cost control"). Score 1-5 (3 = competent).`;
      const res = await generateObject({ model: getModel(), prompt, schema: FeedbackSchema });
      feedback = res.object;
    } catch {
      feedback = {
        score: 3,
        did_well: "You completed the task and submitted evidence.",
        improve: "Add more specific owners, dates, and decision rights next time.",
        real_world: "In a live project this is the minimum bar a sponsor expects before sign-off.",
        skill: task.category ?? "Project Coordination",
      };
    }

    const impact = ImpactSchema.parse((task.impact as Impact) ?? {});
    const { summary } = await applyImpact(supabase, userId, impact);

    await supabase
      .from("tasks")
      .update({
        status: "approved",
        completed_at: new Date().toISOString(),
        feedback,
      })
      .eq("id", data.id)
      .eq("user_id", userId);

    // Story log + reflection
    const { data: state } = await supabase
      .from("simulation_state")
      .select("story_log")
      .eq("user_id", userId)
      .maybeSingle();
    const log = Array.isArray(state?.story_log) ? state!.story_log : [];
    await supabase
      .from("simulation_state")
      .update({
        story_log: [
          ...log,
          {
            at: new Date().toISOString(),
            beat: `Closed "${task.title}". ${summary.join("; ") || "Acknowledged."}`,
          },
        ].slice(-50),
      })
      .eq("user_id", userId);

    try {
      await supabase.from("reflection_entries").insert({
        user_id: userId,
        prompt: `What did you take away from "${task.title}"?`,
        answer: `${feedback.did_well}\n\nTo improve: ${feedback.improve}\n\nReal-world: ${feedback.real_world}`,
      });
    } catch {
      // table may have different shape — non-fatal
    }

    return { ok: true, decision: "approved" as const, feedback, impact_summary: summary };
  });

/* ---------- GENERATE TASKS FROM EMAIL ---------- */

export async function generateTasksFromEmail(
  supabase: any,
  userId: string,
  message: { id: string; sender_name: string; sender_role: string; subject: string; body: string; tone: string },
): Promise<number> {
  const pctx = await getProjectCtx(supabase, userId);
  const prompt = `A stakeholder just emailed the project coordinator on the "${pctx.name}" project${pctx.description ? ` — ${pctx.description}` : ""}.
${pctx.domainGuard}
From: ${message.sender_name} (${message.sender_role})
Tone: ${message.tone}
Subject: ${message.subject}
Body:
${message.body}

Generate 2 to 4 concrete project-coordinator tasks the coordinator must complete to actually resolve the underlying issue (not just reply by email). Each task should be the kind of work a real PC does on THIS project — use the technical jargon relevant to the domain (e.g. update RAID log, draft cost-to-complete forecast, schedule a meeting, prepare steering pack, chase the vendor, run a data-cleanse sprint, publish a permission-set matrix, etc. — pick what fits).

For each task, set:
- category: one of ${TASK_CATEGORIES.join(", ")}
- linked_area: one of ${LINKED_AREAS.join(", ")}
- linked_stakeholder: the person most affected (default to the sender)
- completion_action: ONE sentence describing exactly what the coordinator must produce/do
- priority: low|medium|high|critical (match urgency of the email)
- impact: small ints describing what completing this task improves. Use sentiment as { "${message.sender_name}": +10..+20 }. Use reputation +1..+5. Use budget_confidence/timeline_risk when relevant. Use health +1 only for very significant work.

Be specific to the email — do NOT return generic templates.`;

  let batch: z.infer<typeof TaskBatchSchema>;
  try {
    const res = await generateObject({ model: getModel(), prompt, schema: TaskBatchSchema });
    batch = res.object;
  } catch {
    return 0;
  }

  const rows = batch.tasks.map((t: TaskSpec) => ({
    user_id: userId,
    title: t.title,
    description: t.description,
    category: t.category,
    linked_area: t.linked_area,
    linked_stakeholder: t.linked_stakeholder ?? message.sender_name,
    linked_module_route: AREA_TO_ROUTE[t.linked_area] ?? null,
    completion_action: t.completion_action,
    priority: t.priority,
    impact: t.impact as any,
    status: "todo",
    source: "email",
    source_ref: message.id,
  }));

  const { error } = await supabase.from("tasks").insert(rows);
  if (error) return 0;
  return rows.length;
}

/* ---------- ESCALATE A TASK ---------- */

export const escalateTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        mode: z.enum(["assign_lead", "ask_pm", "escalate_sponsor", "add_to_raid"]),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: task } = await supabase
      .from("tasks")
      .select("*")
      .eq("id", data.id)
      .eq("user_id", userId)
      .maybeSingle();
    if (!task) throw new Error("Task not found");

    const roster = await loadRoster(supabase, userId);
    const byRole = rosterByRole(roster);
    const pmName = byRole.pm?.name ?? DEFAULT_ROSTER.find((r) => r.role === "pm")!.name;
    const sponsorName = byRole.sponsor?.name ?? DEFAULT_ROSTER.find((r) => r.role === "sponsor")!.name;
    const ownerMap: Record<string, string> = {
      ask_pm: pmName,
      escalate_sponsor: sponsorName,
      assign_lead: task.linked_stakeholder ?? "Functional Lead",
      add_to_raid: task.linked_stakeholder ?? "RAID owner",
    };
    const newOwner = ownerMap[data.mode];

    await supabase
      .from("tasks")
      .update({
        status: "blocked",
        linked_stakeholder: newOwner,
        description: `${task.description ?? ""}\n\n[Escalated] ${newOwner} now owns this action.`.trim(),
      })
      .eq("id", data.id)
      .eq("user_id", userId);

    if (data.mode === "add_to_raid") {
      await supabase.from("raid_items").insert({
        user_id: userId,
        kind: "issue",
        severity: task.priority === "critical" ? "critical" : "high",
        status: "open",
        title: task.title,
        description: task.completion_action ?? task.description ?? task.title,
        owner: newOwner,
      });
    }

    await supabase.from("inbox_messages").insert({
      user_id: userId,
      sender_name: "Project Update",
      sender_role: "System",
      subject: `${newOwner} has taken ownership of "${task.title}"`,
      body: `${newOwner} has accepted this action. The task is parked on your board until they come back to you with progress.`,
      tone: "neutral",
    });

    return { ok: true, owner: newOwner };
  });

/* ---------- COMPLETED WORK LOG ---------- */

export const listCompletedWork = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("tasks")
      .select("*")
      .eq("user_id", context.userId)
      .in("status", ["approved", "done", "completed", "closed"])
      .order("completed_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  });