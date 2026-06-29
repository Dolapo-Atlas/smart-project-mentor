import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { applyCompetencyStatus } from "./learning.functions";
import { z } from "zod";
import { generateObject, generateText } from "ai";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";
import type { Json } from "@/integrations/supabase/types";
import { loadRoster, rosterByRole, rosterByName, DEFAULT_ROSTER, type RosterMember } from "./roster";

const MODEL = "google/gemini-3-flash-preview";
function getModel() {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("Missing LOVABLE_API_KEY");
  return createLovableAiGatewayProvider(key)(MODEL);
}

/**
 * Pull the active project context for the current user so AI prompts can be
 * grounded in the right project (CRM, Website, EV Charging, etc.) instead of
 * defaulting to "Digital Care Records Rollout".
 */
async function getProjectCtx(supabase: any, userId: string) {
  const { data: profile } = await supabase
    .from("profiles")
    .select("current_project_instance_id")
    .eq("id", userId)
    .maybeSingle();
  const instanceId = profile?.current_project_instance_id as string | undefined;
  if (!instanceId) {
    return { name: "the programme", description: "", category: "", skills: [] as string[], domainGuard: "" };
  }
  const { data: inst } = await supabase
    .from("project_instances")
    .select("display_name, project_templates(title, description, category, key_skills)")
    .eq("id", instanceId)
    .maybeSingle();
  const tpl: any = (inst as any)?.project_templates ?? {};
  const name = (inst as any)?.display_name || tpl.title || "the programme";
  const description: string = tpl.description ?? "";
  const category: string = tpl.category ?? "";
  const skills: string[] = Array.isArray(tpl.key_skills) ? tpl.key_skills : [];
  const isHealth = /care|health|clinical|patient|nhs/i.test(`${name} ${category} ${description}`);
  const domainGuard = isHealth
    ? ""
    : `IMPORTANT: This is a "${name}" project. Do NOT reference healthcare, care homes, patients, clinical governance, "Digital Care Records", or NHS unless the project title above explicitly says so. Speak only in terms relevant to ${name}.`;
  return { name, description, category, skills, domainGuard };
}

/* ============= ROSTER HELPERS ============= */

/**
 * Persona prose per role. The roster supplies the person's name and title;
 * we layer the *behavioural* persona on top so the AI knows how each archetype
 * is supposed to behave in a meeting, regardless of which name the template
 * happens to use.
 */
const PERSONA_BY_ROLE: Record<string, string> = {
  pm:         "Senior PM. Direct, pragmatic, slightly impatient with vague status. Pushes for owners and dates.",
  sponsor:    "Outcome-focused executive. Uses board language. Pushes back on cost and timeline. Will name names.",
  finance:    "Spreadsheet-led, sceptical of vendor claims. Wants forecast vs actuals, not narrative.",
  tech:       "Engineer. Surfaces integration risk and dependency chains. Resists optimistic dates.",
  vendor:     "Polished commercial lead. Defends vendor pricing and scope. Will offer a workaround before owning a delay.",
  operations: "Operational lead. Speaks plainly. Protective of staff. Raises readiness and run-state concerns.",
  admin:      "Domain administrator. Notices process and compliance gaps the room is glossing over.",
  clinical:   "Safety-first specialist. Will halt go-lives over governance gaps.",
  care_home:  "Site manager. Protective of staff. Speaks plainly. Raises readiness and training concerns.",
};

function personaFor(role: string): string {
  return PERSONA_BY_ROLE[role] ?? `${role} specialist. Speaks from their domain expertise and pushes back when something doesn't add up.`;
}

function memberToAttendee(m: RosterMember): Attendee {
  return {
    role_key: m.role,
    name: m.name,
    role: m.title,
    persona: personaFor(m.role),
  };
}

/** Which roles should be in the room for each meeting kind. */
const KIND_ROLES: Record<string, string[]> = {
  standup:  ["pm", "tech", "operations", "clinical"],
  steering: ["sponsor", "pm", "finance", "clinical", "operations"],
  vendor:   ["vendor", "tech", "pm"],
  retro:    ["pm", "tech", "operations", "care_home"],
};

function attendeesForKind(roster: RosterMember[], kind: string): Attendee[] {
  const wanted = KIND_ROLES[kind] ?? ["pm", "sponsor"];
  const byRole = rosterByRole(roster);
  const seen = new Set<string>();
  const out: Attendee[] = [];
  for (const role of wanted) {
    const m = byRole[role];
    if (m && !seen.has(m.role)) {
      out.push(memberToAttendee(m));
      seen.add(m.role);
    }
  }
  // If kind asks for roles the project doesn't have (e.g. CRM has no
  // `clinical`), fall back to the PM + sponsor so the meeting still opens.
  if (out.length === 0 && roster[0]) out.push(memberToAttendee(roster[0]));
  return out;
}

const Rag = z.enum(["green", "amber", "red"]);

function mondayOf(d: Date): string {
  const date = new Date(d);
  const day = date.getDay();
  const diff = (day === 0 ? -6 : 1 - day);
  date.setDate(date.getDate() + diff);
  return date.toISOString().slice(0, 10);
}

/* ============= STATUS REPORTS ============= */

export const listStatusReports = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("status_reports")
      .select("*")
      .eq("user_id", context.userId)
      .order("week_start", { ascending: false });
    if (error) throw error;
    return data ?? [];
  });

export const upsertStatusReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      week_start: z.string().optional(),
      rag_summary: Rag,
      achievements: z.string().optional(),
      next_week: z.string().optional(),
      risks_blockers: z.string().optional(),
      submit: z.boolean().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const week_start = data.week_start ?? mondayOf(new Date());
    const base = {
      user_id: context.userId,
      week_start,
      rag_summary: data.rag_summary,
      achievements: data.achievements ?? null,
      next_week: data.next_week ?? null,
      risks_blockers: data.risks_blockers ?? null,
      submitted_at: data.submit ? new Date().toISOString() : null,
    };
    const { data: row, error } = await context.supabase
      .from("status_reports")
      .upsert(base, { onConflict: "user_id,week_start" })
      .select()
      .single();
    if (error) throw error;

    if (data.submit) {
      // AI scores the submitted report
      try {
        const Schema = z.object({
          score: z.number().int().min(0).max(100),
          summary: z.string(),
          strengths: z.array(z.string()),
          weaknesses: z.array(z.string()),
          sponsor_reaction: z.string(),
        });
        const projectCtx = await getProjectCtx(context.supabase, context.userId);
        const prompt = `You are a programme sponsor reviewing a weekly status report from your project coordinator on the "${projectCtx.name}" project.
${projectCtx.domainGuard}

Week: ${week_start}
RAG: ${data.rag_summary}
Achievements:
${data.achievements || "(none)"}

Next week:
${data.next_week || "(none)"}

Risks / blockers:
${data.risks_blockers || "(none)"}

Score 0-100. A good status report has: concrete achievements with evidence, named risks with owners and mitigations, a credible plan for next week, and an RAG that matches the narrative. Push back hard on vague language, missing owners, or RAG that contradicts the content.`;
        const { object } = await generateObject({
          model: getModel(),
          schema: Schema,
          prompt,
        });
        await context.supabase
          .from("status_reports")
          .update({ ai_score: object.score, ai_feedback: object })
          .eq("id", row.id);

        // Sponsor reaction in inbox
        {
          const roster = await loadRoster(context.supabase, context.userId);
          const sponsor = rosterByRole(roster).sponsor ?? DEFAULT_ROSTER.find((r) => r.role === "sponsor")!;
          await context.supabase.from("inbox_messages").insert({
            user_id: context.userId,
            sender_name: sponsor.name,
            sender_role: sponsor.title,
            subject: `Re: Week ${week_start} status`,
            body: object.sponsor_reaction,
            tone: object.score >= 70 ? "supportive" : object.score >= 50 ? "curious" : "frustrated",
          });
        }

        // Submitting a credible status report ticks reporting competencies.
        try {
          const ticks = ["p5.status_reporting", "p5.project_updates", "p7.governance_reporting"];
          await applyCompetencyStatus(
            context.supabase,
            context.userId,
            ticks,
            object.score >= 65 ? "mastered" : "drafting",
          );
        } catch (e) {
          console.error("learning journey status-report tick failed", e);
        }
      } catch (e) {
        console.error("status report scoring failed", e);
      }
      // Chapter trigger: submitting a status report closes chapter 10.
      try {
        const { tickChapterBySlug } = await import("@/lib/chapters.functions");
        await tickChapterBySlug(context.supabase, context.userId, "status-report");
      } catch (e) {
        console.error("chapter tick (status-report) failed", e);
      }
    }
    return row;
  });

/* ============= BUDGET ============= */

const DEFAULT_BUDGET: Array<{ category: string; description: string; amount: number }> = [
  { category: "Software & Licensing", description: "CareSoft platform licences (12 sites x 12 months)", amount: 180000 },
  { category: "Implementation", description: "CareSoft implementation services", amount: 95000 },
  { category: "Hardware", description: "Tablets, docks, network upgrades", amount: 70000 },
  { category: "Training", description: "Staff training across 12 care homes", amount: 60000 },
  { category: "Internal Resources", description: "Coordinator, BA, clinical SME time", amount: 55000 },
  { category: "Contingency", description: "10% contingency", amount: 40000 },
];

export const seedBudgetIfEmpty = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { count } = await context.supabase
      .from("budget_lines")
      .select("*", { count: "exact", head: true })
      .eq("user_id", context.userId);
    if ((count ?? 0) > 0) return { seeded: false };
    const rows = DEFAULT_BUDGET.map((b) => ({
      user_id: context.userId,
      category: b.category,
      description: b.description,
      amount: b.amount,
      kind: "planned" as const,
    }));
    const { error } = await context.supabase.from("budget_lines").insert(rows);
    if (error) throw error;
    return { seeded: true };
  });

export const listBudget = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("budget_lines")
      .select("*")
      .eq("user_id", context.userId)
      .order("line_date", { ascending: false });
    if (error) throw error;
    return data ?? [];
  });

export const addBudgetLine = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      category: z.string().min(1),
      description: z.string().optional(),
      amount: z.number(),
      kind: z.enum(["planned", "actual", "invoice", "forecast"]),
      vendor: z.string().optional(),
      line_date: z.string().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("budget_lines")
      .insert({ user_id: context.userId, ...data })
      .select()
      .single();
    if (error) throw error;
    // Chapter trigger: first budget line closes the budget-lock chapter.
    try {
      const { tickChapterBySlug } = await import("@/lib/chapters.functions");
      await tickChapterBySlug(context.supabase, context.userId, "budget-lock");
    } catch (e) {
      console.error("chapter tick (budget-lock) failed", e);
    }
    return row;
  });

export const deleteBudgetLine = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("budget_lines")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw error;
    return { ok: true };
  });

/* ============= CHANGE REQUESTS ============= */

export const listChangeRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("change_requests")
      .select("*")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  });

export const generateChangeRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const Schema = z.object({
      title: z.string(),
      description: z.string(),
      requested_by: z.string(),
      cost_impact: z.number(),
      schedule_impact_days: z.number().int(),
      risk_impact: z.enum(["low", "medium", "high"]),
    });
    const pctx = await getProjectCtx(context.supabase, context.userId);
    const roster = await loadRoster(context.supabase, context.userId);
    const cast = roster.map((r) => `${r.name} (${r.title})`).join(", ");
    const prompt = `Generate ONE realistic change request for the "${pctx.name}" project${pctx.description ? ` — ${pctx.description}` : ""}.
${pctx.domainGuard}

Pick a plausible requester from this cast: ${cast}. Use their exact name in requested_by.

Be specific to the project domain: name a concrete scope change (e.g. add a module, extend a phase, swap a tool, vendor adds cost for a new integration). cost_impact in GBP (can be negative for descope). schedule_impact_days can be negative. risk_impact reflects whether this raises overall project risk.`;
    const { object } = await generateObject({ model: getModel(), schema: Schema, prompt });
    const { data: row, error } = await context.supabase
      .from("change_requests")
      .insert({ user_id: context.userId, ...object })
      .select()
      .single();
    if (error) throw error;
    return row;
  });

export const decideChangeRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string().uuid(),
      decision: z.enum(["approved", "rejected"]),
      impact_assessment: z.string().min(10),
      decision_notes: z.string().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: cr } = await context.supabase
      .from("change_requests")
      .select("*")
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .single();
    if (!cr) throw new Error("Not found");

    await context.supabase
      .from("change_requests")
      .update({
        status: data.decision,
        impact_assessment: data.impact_assessment,
        decision_notes: data.decision_notes ?? null,
        decided_at: new Date().toISOString(),
      })
      .eq("id", data.id);

    // If approved, post the cost to budget as a forecast line
    if (data.decision === "approved" && Number(cr.cost_impact) !== 0) {
      await context.supabase.from("budget_lines").insert({
        user_id: context.userId,
        category: "Change Requests",
        description: `CR: ${cr.title}`,
        amount: cr.cost_impact,
        kind: "forecast",
        vendor: cr.requested_by,
      });
    }

    // Stakeholder reaction — finance lead celebrates / disappointed requester pushes back.
    const roster = await loadRoster(context.supabase, context.userId);
    const byRole = rosterByRole(roster);
    const byName = rosterByName(roster);
    const reactorMember =
      data.decision === "approved"
        ? byRole.finance ?? byRole.sponsor ?? roster[0]
        : byName[cr.requested_by] ?? roster[0];
    const reactor = reactorMember?.name ?? cr.requested_by;
    const reactorRole = reactorMember?.title ?? "Stakeholder";
    await context.supabase.from("inbox_messages").insert({
      user_id: context.userId,
      sender_name: reactor,
      sender_role: reactorRole,
      subject: `Re: CR — ${cr.title}`,
      body: data.decision === "approved"
        ? `Noted that CR "${cr.title}" has been approved. I'll need the updated forecast and a revised funding ask routed through governance by end of week. Your impact assessment is on file.`
        : `Disappointed but I understand the decision on "${cr.title}". I'd like to discuss alternatives — can we book 30 minutes this week? The original need hasn't gone away.`,
      tone: data.decision === "approved" ? "neutral" : "frustrated",
    });

    return { ok: true };
  });

/* ============= PHASE GATES ============= */

const PHASES = ["initiation", "planning", "execution", "closure"] as const;

export const listGates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    let { data } = await context.supabase
      .from("phase_gates")
      .select("*")
      .eq("user_id", context.userId);
    if (!data || data.length === 0) {
      const rows = PHASES.map((p, i) => ({
        user_id: context.userId,
        phase: p,
        status: i === 0 ? ("open" as const) : ("locked" as const),
      }));
      const { data: inserted } = await context.supabase
        .from("phase_gates")
        .insert(rows)
        .select();
      data = inserted ?? [];
    }
    return data.sort(
      (a, b) => PHASES.indexOf(a.phase as typeof PHASES[number]) - PHASES.indexOf(b.phase as typeof PHASES[number]),
    );
  });

export const submitGate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      phase: z.enum(PHASES),
      defence: z.string().min(20),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Pull artefacts for the AI panel
    const [{ data: docs }, { data: raid }, { data: reports }, { data: gates }] = await Promise.all([
      supabase.from("documents").select("title,quality_score,status").eq("user_id", userId),
      supabase.from("raid_items").select("kind,title,severity,status").eq("user_id", userId),
      supabase.from("status_reports").select("week_start,rag_summary,ai_score").eq("user_id", userId),
      supabase.from("phase_gates").select("*").eq("user_id", userId),
    ]);

    const Schema = z.object({
      decision: z.enum(["passed", "failed"]),
      score: z.number().int().min(0).max(100),
      summary: z.string(),
      strengths: z.array(z.string()),
      concerns: z.array(z.string()),
      conditions: z.array(z.string()),
    });

    const prompt = `You are the governance board (Sponsor + PMO Head + Finance Lead + Clinical Lead) holding the ${data.phase.toUpperCase()} phase gate review for the Digital Care Records Rollout.

Coordinator's defence:
${data.defence}

Evidence on file:
- Documents: ${JSON.stringify(docs)}
- RAID items: ${JSON.stringify(raid)}
- Recent status reports: ${JSON.stringify(reports)}

Decide: pass or fail this gate. Score 0-100. Be tough but fair. Failed means the phase cannot close — list specific conditions for re-review. Passed may still come with conditions. Concerns must be concrete (not "more detail needed" — name what is missing).`;

    const { object } = await generateObject({ model: getModel(), schema: Schema, prompt });

    await supabase
      .from("phase_gates")
      .update({
        status: object.decision,
        score: object.score,
        feedback: object,
        decided_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .eq("phase", data.phase);

    // Unlock next phase on pass
    if (object.decision === "passed") {
      const idx = PHASES.indexOf(data.phase);
      if (idx >= 0 && idx < PHASES.length - 1) {
        const next = PHASES[idx + 1];
        const nextGate = gates?.find((g) => g.phase === next);
        if (nextGate && nextGate.status === "locked") {
          await supabase
            .from("phase_gates")
            .update({ status: "open", opened_at: new Date().toISOString() })
            .eq("id", nextGate.id);
        }
        await supabase
          .from("simulation_state")
          .update({ phase: next })
          .eq("user_id", userId);
      }
    }

    return object;
  });

/* ============= MEETINGS ============= */

type Attendee = { role_key: string; name: string; role: string; persona: string };
type TranscriptTurn = {
  at: string;
  kind: "speaker" | "user" | "system";
  speaker_name: string;
  speaker_role: string;
  role_key: string;
  body: string;
};

// Meeting attendees are derived from the active project's roster — see
// `attendeesForKind()` and `memberToAttendee()` above.

export const listMeetings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("meetings")
      .select("*")
      .eq("user_id", context.userId)
      .order("scheduled_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  });

export const createMeeting = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      kind: z.enum(["standup", "steering", "vendor", "retro"]),
      title: z.string().min(1),
      agenda: z.string().optional(),
      scheduled_at: z.string().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const roster = await loadRoster(context.supabase, context.userId);
    const attendees = attendeesForKind(roster, data.kind);
    const { data: row, error } = await context.supabase
      .from("meetings")
      .insert({
        user_id: context.userId,
        ...data,
        scheduled_at: data.scheduled_at ?? new Date().toISOString(),
        attendees: attendees as unknown as Json,
        transcript: [] as unknown as Json,
      })
      .select()
      .single();
    if (error) throw error;
    return row;
  });

/* Live, interactive meeting */

async function loadMeeting(supabase: any, userId: string, id: string) {
  const { data: meeting, error } = await supabase
    .from("meetings").select("*").eq("id", id).eq("user_id", userId).single();
  if (error || !meeting) throw new Error("Meeting not found");
  return meeting;
}

function transcriptOf(meeting: any): TranscriptTurn[] {
  return Array.isArray(meeting.transcript) ? (meeting.transcript as TranscriptTurn[]) : [];
}
function attendeesOf(meeting: any): Attendee[] {
  return Array.isArray(meeting.attendees) ? (meeting.attendees as Attendee[]) : [];
}

export const listAttendeeRoster = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const roster = await loadRoster(context.supabase, context.userId);
    return roster.map(memberToAttendee);
  });

export const addMeetingAttendee = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string().uuid(),
      role_key: z.string().optional(),
      custom: z
        .object({
          name: z.string().min(1),
          role: z.string().min(1),
          persona: z.string().optional(),
        })
        .optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const meeting = await loadMeeting(context.supabase, context.userId, data.id);
    const current = attendeesOf(meeting);
    const roster = await loadRoster(context.supabase, context.userId);
    const byRole = rosterByRole(roster);
    let toAdd: Attendee | undefined;
    if (data.role_key && byRole[data.role_key]) {
      toAdd = memberToAttendee(byRole[data.role_key]);
    } else if (data.custom) {
      const slug = data.custom.name.toLowerCase().replace(/[^a-z0-9]+/g, "_").slice(0, 24) || `guest_${Date.now()}`;
      toAdd = {
        role_key: `custom_${slug}_${Math.random().toString(36).slice(2, 6)}`,
        name: data.custom.name,
        role: data.custom.role,
        persona: data.custom.persona || `${data.custom.role}. Speaks from their domain expertise, asks pointed questions, and pushes back when something doesn't add up.`,
      };
    }
    if (!toAdd) throw new Error("Nothing to add");
    if (current.some((a) => a.role_key === toAdd!.role_key)) return meeting;
    const next = [...current, toAdd];
    const { data: row, error } = await context.supabase
      .from("meetings")
      .update({ attendees: next as unknown as Json })
      .eq("id", data.id)
      .select()
      .single();
    if (error) throw error;
    return row;
  });

export const removeMeetingAttendee = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), role_key: z.string() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const meeting = await loadMeeting(context.supabase, context.userId, data.id);
    const next = attendeesOf(meeting).filter((a) => a.role_key !== data.role_key);
    const { data: row, error } = await context.supabase
      .from("meetings")
      .update({ attendees: next as unknown as Json })
      .eq("id", data.id)
      .select()
      .single();
    if (error) throw error;
    return row;
  });

export const startMeeting = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const meeting = await loadMeeting(context.supabase, context.userId, data.id);
    const attendees = attendeesOf(meeting);
    const roster = await loadRoster(context.supabase, context.userId);
    if (attendees.length === 0) {
      const fresh = attendeesForKind(roster, meeting.kind);
      await context.supabase.from("meetings").update({ attendees: fresh as unknown as Json }).eq("id", meeting.id);
    }
    // Opening turn: PM (or first attendee) frames the meeting.
    const list = attendees.length ? attendees : attendeesForKind(roster, meeting.kind);
    const opener = list.find((a) => a.role_key === "pm") ?? list[0];
    if (!opener) return meeting;
    const transcript = transcriptOf(meeting);
    if (transcript.length > 0) return meeting;

    const pctx = await getProjectCtx(context.supabase, context.userId);
    const prompt = `You are ${opener.name}, ${opener.role}. ${opener.persona}
You are opening a ${meeting.kind} meeting titled "${meeting.title}" on the "${pctx.name}" project${pctx.description ? ` (${pctx.description})` : ""}.
${pctx.domainGuard}
Agenda: ${meeting.agenda || "(none — set the frame yourself in 1 sentence)"}

Open the meeting in 1-2 sentences. Greet the room, name what we're here to resolve, and hand off to the next person with a specific question. Plain spoken, no fluff.`;
    const { text } = await generateText({ model: getModel(), prompt });
    const turn: TranscriptTurn = {
      at: new Date().toISOString(),
      kind: "speaker",
      speaker_name: opener.name,
      speaker_role: opener.role,
      role_key: opener.role_key,
      body: text.trim(),
    };
    const { data: row } = await context.supabase
      .from("meetings")
      .update({ transcript: [turn] as unknown as Json, attendees: list as unknown as Json })
      .eq("id", meeting.id)
      .select()
      .single();
    return row;
  });

export const speakInMeeting = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), body: z.string().min(1) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const meeting = await loadMeeting(context.supabase, context.userId, data.id);
    const transcript = transcriptOf(meeting);
    const turn: TranscriptTurn = {
      at: new Date().toISOString(),
      kind: "user",
      speaker_name: "You (Coordinator)",
      speaker_role: "Project Coordinator",
      role_key: "user",
      body: data.body.trim(),
    };
    const next = [...transcript, turn];
    const { data: row } = await context.supabase
      .from("meetings").update({ transcript: next as unknown as Json }).eq("id", meeting.id).select().single();
    return row;
  });

export const noteInMeeting = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), body: z.string().min(1) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const meeting = await loadMeeting(context.supabase, context.userId, data.id);
    const transcript = transcriptOf(meeting);
    const turn: TranscriptTurn = {
      at: new Date().toISOString(),
      kind: "system",
      speaker_name: "Minutes",
      speaker_role: "Coordinator notes",
      role_key: "minutes",
      body: data.body.trim(),
    };
    const { data: row } = await context.supabase
      .from("meetings").update({ transcript: [...transcript, turn] as unknown as Json }).eq("id", meeting.id).select().single();
    return row;
  });

export const advanceMeeting = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string().uuid(),
      role_key: z.string().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const meeting = await loadMeeting(context.supabase, context.userId, data.id);
    let attendees = attendeesOf(meeting);
    if (attendees.length === 0) {
      const roster = await loadRoster(context.supabase, context.userId);
      attendees = attendeesForKind(roster, meeting.kind);
    }
    const transcript = transcriptOf(meeting);

    let speaker: Attendee | undefined;
    if (data.role_key) {
      speaker = attendees.find((a) => a.role_key === data.role_key);
    }
    if (!speaker) {
      // Pick an attendee who hasn't spoken in the last 2 turns; otherwise random.
      const recent = transcript.slice(-2).map((t) => t.role_key);
      const eligible = attendees.filter((a) => !recent.includes(a.role_key));
      const pool = eligible.length ? eligible : attendees;
      speaker = pool[Math.floor(Math.random() * pool.length)];
    }
    if (!speaker) throw new Error("No attendees");

    const transcriptText = transcript
      .slice(-12)
      .map((t) => `${t.speaker_name} (${t.speaker_role}): ${t.body}`)
      .join("\n\n");

    const pctx = await getProjectCtx(context.supabase, context.userId);
    const prompt = `You are ${speaker.name}, ${speaker.role}, in a live ${meeting.kind} meeting on the "${pctx.name}" project${pctx.description ? ` (${pctx.description})` : ""}.
${pctx.domainGuard}
Persona: ${speaker.persona}

Meeting: "${meeting.title}"
Agenda: ${meeting.agenda || "(none)"}
Other people in the room: ${attendees.filter((a) => a.role_key !== speaker.role_key).map((a) => `${a.name} (${a.role})`).join(", ")}

Transcript so far:
${transcriptText || "(meeting just started)"}

Speak ONLY as ${speaker.name}. 1-3 sentences. Stay in character. React to what was just said — agree, push back, raise a concern, or ask a sharp question. Reference specifics from the project where natural. Do not narrate, do not write stage directions, no quotes around your line. Just speak.`;

    const { text } = await generateText({ model: getModel(), prompt });
    const turn: TranscriptTurn = {
      at: new Date().toISOString(),
      kind: "speaker",
      speaker_name: speaker.name,
      speaker_role: speaker.role,
      role_key: speaker.role_key,
      body: text.trim(),
    };
    const { data: row } = await context.supabase
      .from("meetings")
      .update({ transcript: [...transcript, turn] as unknown as Json, attendees: attendees as unknown as Json })
      .eq("id", meeting.id)
      .select()
      .single();
    return row;
  });

export const holdMeeting = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string().uuid(),
      decisions: z.string().optional(),
      minutes: z.string().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: meeting } = await context.supabase
      .from("meetings")
      .select("*")
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .single();
    if (!meeting) throw new Error("Not found");

    let ai_summary: string | null = null;
    try {
      const pctx = await getProjectCtx(context.supabase, context.userId);
      const { text } = await generateText({
        model: getModel(),
        prompt: `Summarise this ${meeting.kind} meeting on the "${pctx.name}" project in 3-5 bullet points covering decisions, actions (with owners), and unresolved questions. Be terse and workplace-realistic.
${pctx.domainGuard}

Agenda:
${meeting.agenda ?? "(none)"}

Decisions captured:
${data.decisions ?? "(none)"}

Minutes:
${data.minutes ?? "(none)"}`,
      });
      ai_summary = text;
    } catch (e) {
      console.error("meeting summary failed", e);
    }

    const { data: row, error } = await context.supabase
      .from("meetings")
      .update({
        decisions: data.decisions ?? null,
        minutes: data.minutes ?? null,
        ai_summary,
        held: true,
      })
      .eq("id", data.id)
      .select()
      .single();
    if (error) throw error;
    return row;
  });

export const autoMinutes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const meeting = await loadMeeting(context.supabase, context.userId, data.id);
    const transcript = transcriptOf(meeting);
    if (transcript.length === 0) {
      throw new Error("Nothing to capture yet — start the meeting first.");
    }
    const transcriptText = transcript
      .map((t) =>
        t.kind === "system"
          ? `[Note] ${t.body}`
          : `${t.speaker_name} (${t.speaker_role}): ${t.body}`,
      )
      .join("\n\n");

    const pctx = await getProjectCtx(context.supabase, context.userId);
    const prompt = `You are taking minutes for a ${meeting.kind} meeting titled "${meeting.title}" on the "${pctx.name}" project.
${pctx.domainGuard}

Transcript:
${transcriptText}

Return THREE labelled sections, plain text, no markdown headers, no preamble:

DECISIONS:
- bullet list of concrete decisions made (with owner if named). If none, write "None yet."

MINUTES:
- terse bullet minutes of what was discussed, in chronological order. Attribute points to speakers by first name.

SUMMARY:
2-3 sentence executive summary covering outcome, risks raised, and next steps.`;

    const { text } = await generateText({ model: getModel(), prompt });

    const grab = (label: string) => {
      const re = new RegExp(`${label}:\\s*([\\s\\S]*?)(?=\\n[A-Z]{4,}:|$)`, "i");
      return text.match(re)?.[1]?.trim() ?? "";
    };
    const decisions = grab("DECISIONS");
    const minutes = grab("MINUTES");
    const summary = grab("SUMMARY");

    return {
      decisions: decisions || null,
      minutes: minutes || null,
      summary: summary || null,
      raw: text,
    };
  });

export const sendMinutesToAttendees = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase;
    const uid = context.userId;
    const meeting = await loadMeeting(supabase, uid, data.id);
    if (!meeting.held) throw new Error("Close the meeting first.");
    if (!meeting.minutes && !meeting.ai_summary && !meeting.decisions) {
      throw new Error("Capture minutes before sending.");
    }
    const attendees = attendeesOf(meeting);
    if (attendees.length === 0) throw new Error("No attendees to send minutes to.");

    const subject = `Minutes — ${meeting.title}`;
    const body =
      `Hi team,\n\nThanks for joining the ${meeting.kind} on "${meeting.title}". ` +
      `Minutes are below for your records.\n\n` +
      (meeting.decisions ? `DECISIONS\n${meeting.decisions}\n\n` : "") +
      (meeting.minutes ? `MINUTES\n${meeting.minutes}\n\n` : "") +
      (meeting.ai_summary ? `SUMMARY\n${meeting.ai_summary}\n\n` : "") +
      `Please flag corrections by reply.\n\nCoordinator`;

    const threadId = crypto.randomUUID();
    const toRoles = attendees.map((a) => a.role_key);

    // One outbound comms record covering all recipients
    await supabase.from("comms_messages").insert({
      user_id: uid,
      thread_id: threadId,
      direction: "outbound",
      from_role: "coordinator",
      to_roles: toRoles,
      msg_type: "Update",
      subject,
      body,
      attachment_kind: null,
      attachment_ref: meeting.id,
      attachment_label: `Meeting minutes · ${meeting.title}`,
    });

    // Drop a delivery confirmation into the user's inbox per attendee so it's
    // visible that the minutes were actually sent out.
    for (const a of attendees) {
      await supabase.from("inbox_messages").insert({
        user_id: uid,
        sender_name: a.name,
        sender_role: a.role,
        subject: `Re: ${subject}`,
        body: `Got the minutes — thanks. I'll come back if anything looks off.\n\n${a.name}`,
        tone: "supportive",
      });
    }

    const sentAt = new Date().toISOString();
    const { data: row, error } = await supabase
      .from("meetings")
      .update({ minutes_sent_at: sentAt })
      .eq("id", meeting.id)
      .select()
      .single();
    if (error) throw error;

    // Auto-close any task that looks like a "send minutes" follow-up for
    // this meeting so the user doesn't have to tick it off manually.
    const titleFrag = meeting.title.split(/\s+/).slice(0, 3).join(" ").toLowerCase();
    const { data: openTasks } = await supabase
      .from("tasks")
      .select("id,title,status")
      .eq("user_id", uid)
      .neq("status", "done");
    const closed: string[] = [];
    for (const t of openTasks ?? []) {
      const tt = (t.title ?? "").toLowerCase();
      const isMinutesTask = tt.includes("minute") || tt.includes("minutes");
      const isSendTask = ["send", "circulate", "distribute", "share", "email", "attendee"].some((word) => tt.includes(word));
      if (isMinutesTask && (isSendTask || tt.includes(titleFrag) || tt.includes(meeting.kind))) {
        await supabase
          .from("tasks")
          .update({ status: "done", completed_at: new Date().toISOString() })
          .eq("id", t.id)
          .eq("user_id", uid);
        closed.push(t.id);
      }
    }

    return { ok: true, recipients: attendees.length, sent_at: sentAt, closed_tasks: closed.length, meeting: row };
  });

/* ============= CONFLICTING STAKEHOLDER ============= */

export const summonConflict = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [{ data: state }, { data: profile }, { data: recentMsgs }, { data: recentCRs }] =
      await Promise.all([
        supabase.from("simulation_state").select("*").eq("user_id", userId).maybeSingle(),
        supabase.from("profiles").select("first_name,preferred_name").eq("id", userId).maybeSingle(),
        supabase.from("inbox_messages").select("sender_name,subject,body").eq("user_id", userId).order("created_at", { ascending: false }).limit(3),
        supabase.from("change_requests").select("title,status").eq("user_id", userId).order("created_at", { ascending: false }).limit(3),
      ]);

    const firstName = profile?.preferred_name?.trim() || profile?.first_name || "the coordinator";

    const Schema = z.object({
      sender_name: z.string(),
      sender_role: z.string(),
      subject: z.string(),
      body: z.string(),
      tone: z.enum(["urgent", "frustrated", "supportive", "curious", "neutral"]),
    });
    const pctx = await getProjectCtx(supabase, userId);
    const roster = await loadRoster(supabase, userId);
    const cast = roster.map((r) => `${r.name} (${r.title}, role:${r.role})`).join("\n- ");
    const prompt = `Generate ONE email where a stakeholder DISAGREES with another stakeholder or with a recent decision on the "${pctx.name}" project. This is real-life project tension, not gameplay.
${pctx.domainGuard}

Cast (pick sender_name and sender_role from here only):
- ${cast}

Pick a realistic disagreement appropriate to this project domain — e.g. finance pushing back on vendor cost, an operations/site lead protesting they're being rushed, a technical lead disputing a sponsor decision that ignores integration risk, a vendor refusing to absorb scope-change cost, or the sponsor questioning why issues are being escalated rather than resolved.

Reference real context. Coordinator: ${firstName}. Project health: ${state?.health}. Recent messages: ${JSON.stringify(recentMsgs)}. Recent change requests: ${JSON.stringify(recentCRs)}.

The email should put ${firstName} in the middle and force a judgement call. Address ${firstName} by first name. 2-4 short paragraphs. Sign off with the stakeholder's name and title.`;

    const { object } = await generateObject({ model: getModel(), schema: Schema, prompt });
    const { data: msg, error } = await supabase
      .from("inbox_messages")
      .insert({ user_id: userId, ...object })
      .select()
      .single();
    if (error) throw error;
    return msg;
  });

/* ============= STAKEHOLDER RELATIONSHIPS ============= */

// Archetype starting sentiment is now keyed by ROLE (not name), so every
// project gets the same disposition baselines regardless of which person
// is filling each seat.
export const ARCHETYPE_SENTIMENT_BY_ROLE: Record<string, number> = {
  sponsor:    0,
  pm:         10,
  finance:    -10,
  tech:       -5,
  operations: -5,
  admin:      0,
  care_home:  -5,
  clinical:   -15,
  vendor:     0,
};

// Backward-compat: legacy modules import `ARCHETYPE_SENTIMENT` keyed by
// stakeholder name. Returning 0 for unknown names is safe because every
// call site uses `?? 0`.
export const ARCHETYPE_SENTIMENT: Record<string, number> = {
  "David Okafor": 0,
  "Sarah Williams": 10,
  "Priya Anand": -10,
  "James Lin": -5,
  "Margaret Hollis": -5,
  "Rachel Stone": -15,
  "CareSoft Ltd": 0,
};

function baselineFor(member: { role: string; name: string } | undefined): number {
  if (!member) return 0;
  return ARCHETYPE_SENTIMENT_BY_ROLE[member.role] ?? ARCHETYPE_SENTIMENT[member.name] ?? 0;
}

export const getStakeholders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const roster = await loadRoster(supabase, userId);
    const { data: rows } = await supabase
      .from("stakeholder_relationships")
      .select("*")
      .eq("user_id", userId);
    const byName = new Map((rows ?? []).map((r) => [r.stakeholder_name, r]));
    return roster.map((s) => {
      const r = byName.get(s.name);
      return {
        name: s.name,
        role: s.title,
        type: s.role,
        seed: s.seed,
        sentiment: r?.sentiment ?? baselineFor(s),
        concerns: (r?.concerns ?? []) as string[],
        notes: r?.notes ?? "",
        interaction_count: r?.interaction_count ?? 0,
        last_interaction: r?.last_interaction ?? null,
      };
    });
  });

export const updateStakeholder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { name: string; sentimentDelta?: number; addConcern?: string; removeConcern?: string; notes?: string; bumpInteraction?: boolean }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const roster = await loadRoster(supabase, userId);
    const book = rosterByName(roster)[data.name];
    if (!book) throw new Error("Unknown stakeholder");

    const { data: existing } = await supabase
      .from("stakeholder_relationships")
      .select("*")
      .eq("user_id", userId)
      .eq("stakeholder_name", data.name)
      .maybeSingle();

    const current = existing ?? {
      sentiment: baselineFor(book),
      concerns: [] as string[],
      notes: "",
      interaction_count: 0,
    };

    let sentiment = current.sentiment + (data.sentimentDelta ?? 0);
    sentiment = Math.max(-100, Math.min(100, sentiment));

    let concerns = [...(current.concerns ?? [])];
    if (data.addConcern && !concerns.includes(data.addConcern)) concerns.push(data.addConcern);
    if (data.removeConcern) concerns = concerns.filter((c) => c !== data.removeConcern);

    const payload = {
      user_id: userId,
      stakeholder_name: data.name,
      role: book.title,
      sentiment,
      concerns,
      notes: data.notes ?? current.notes,
      interaction_count: current.interaction_count + (data.bumpInteraction ? 1 : 0),
      last_interaction: data.bumpInteraction ? new Date().toISOString() : (existing?.last_interaction ?? null),
    };

    const { data: row, error } = await supabase
      .from("stakeholder_relationships")
      .upsert(payload, { onConflict: "user_id,stakeholder_name" })
      .select()
      .single();
    if (error) throw error;
    return row;
  });

function recoveryTemplate(name: string, member?: RosterMember) {
  if (member?.role === "finance") {
    return {
      subject: "Forecast controls and approval route — follow-up",
      body:
`Hi ${name.split(" ")[0]},

You're right to keep challenging the numbers. I don't want to send another narrative update without giving you the finance control view you need.

I'll separate forecast vs actuals, identify any vendor claims that are outside approved scope, and flag the approval route before any additional spend is treated as agreed. If there is a change request, I'll show cost impact, schedule impact, owner, and the decision needed.

Can you confirm the specific evidence you need before finance will support the next governance update?

Coordinator`,
      reply:
`This is closer to what I need.

Please send the forecast vs actuals and the approval route before the governance pack is finalised. I’m not trying to block the project — I need assurance that cost exposure is visible before decisions are made.

${name.split(" ")[0]}`,
      concern: "Needs forecast vs actuals, cost exposure, and approval route before supporting decisions.",
    };
  }

  return {
    subject: `Relationship reset — ${name}`,
    body:
`Hi ${name},

I can see my previous updates have not fully addressed your concern. I want to reset this properly rather than keep sending more generic replies.

I'll summarise the issue as I understand it, name the owner and next decision, and confirm what evidence you need from me before we move forward.

Coordinator`,
    reply:
`Thanks — that is a better way to handle it.

Please send the clear owner, decision needed, and evidence next. If that is specific enough, I can engage constructively.

${name}`,
    concern: "Needs a specific owner, decision, evidence, and acknowledgement before confidence improves.",
  };
}

export const repairStakeholderRelationship = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ name: z.string().min(1) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const roster = await loadRoster(supabase, userId);
    const book = rosterByName(roster)[data.name];
    if (!book) throw new Error("Unknown stakeholder");

    const { data: existing } = await supabase
      .from("stakeholder_relationships")
      .select("*")
      .eq("user_id", userId)
      .eq("stakeholder_name", data.name)
      .maybeSingle();

    const currentSentiment = existing?.sentiment ?? baselineFor(book);
    const nextSentiment = Math.max(-10, Math.min(100, currentSentiment + 30));
    const template = recoveryTemplate(data.name, book);
    const threadId = crypto.randomUUID();
    const roleKey = book.role;

    await supabase.from("comms_messages").insert({
      user_id: userId,
      thread_id: threadId,
      direction: "outbound",
      from_role: "coordinator",
      to_roles: [roleKey],
      msg_type: "Request",
      subject: template.subject,
      body: template.body,
      attachment_kind: null,
      attachment_ref: null,
      attachment_label: null,
    });

    await supabase.from("comms_messages").insert({
      user_id: userId,
      thread_id: threadId,
      direction: "inbound",
      from_role: roleKey,
      to_roles: ["coordinator"],
      msg_type: "Update",
      subject: `Re: ${template.subject}`,
      body: template.reply,
      sentiment: "neutral",
    });

    await supabase.from("inbox_messages").insert({
      user_id: userId,
      sender_name: data.name,
      sender_role: book.title,
      subject: `Re: ${template.subject}`,
      body: template.reply,
      tone: nextSentiment >= -19 ? "neutral" : "frustrated",
    });

    const concerns = [...((existing?.concerns ?? []) as string[])];
    if (!concerns.includes(template.concern)) concerns.push(template.concern);

    const { data: row, error } = await supabase
      .from("stakeholder_relationships")
      .upsert(
        {
          user_id: userId,
          stakeholder_name: data.name,
          role: book.title,
          sentiment: nextSentiment,
          concerns,
          notes: existing?.notes ?? "",
          interaction_count: (existing?.interaction_count ?? 0) + 1,
          last_interaction: new Date().toISOString(),
        },
        { onConflict: "user_id,stakeholder_name" },
      )
      .select()
      .single();
    if (error) throw error;

    return { ok: true, stakeholder: row, subject: template.subject };
  });