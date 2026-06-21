import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { applyCompetencyStatus } from "./learning.functions";
import { z } from "zod";
import { generateObject, generateText } from "ai";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";
import type { Json } from "@/integrations/supabase/types";

const MODEL = "google/gemini-3-flash-preview";
function getModel() {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("Missing LOVABLE_API_KEY");
  return createLovableAiGatewayProvider(key)(MODEL);
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
        const prompt = `You are a programme sponsor reviewing a weekly status report from your project coordinator on the Digital Care Records Rollout (£500k, 6 months, behind schedule).

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
        await context.supabase.from("inbox_messages").insert({
          user_id: context.userId,
          sender_name: "David Okafor",
          sender_role: "Executive Sponsor, Director of Transformation",
          subject: `Re: Week ${week_start} status`,
          body: object.sponsor_reaction,
          tone: object.score >= 70 ? "supportive" : object.score >= 50 ? "curious" : "frustrated",
        });

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
    const prompt = `Generate ONE realistic change request for the Digital Care Records Rollout project (£500k, 6 months, behind schedule, 12 care homes, vendor: CareSoft Ltd).

Pick a plausible requester from: David Okafor (Executive Sponsor), Sarah Williams (PM), Priya Anand (Finance Lead), James Lin (Technical Lead), CareSoft Ltd (Vendor), Margaret Hollis (Care Home Manager), Rachel Stone (Clinical Governance).

Be specific: name a scope change ("add iPad rollout to 4 additional homes", "extend training by 2 weeks", "swap reporting module for Power BI", "vendor adds £35k for SSO integration"). cost_impact in GBP (can be negative for descope). schedule_impact_days can be negative. risk_impact reflects whether this raises overall project risk.`;
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

    // Stakeholder reaction
    const reactor = data.decision === "approved" ? "Priya Anand" : cr.requested_by;
    const reactorRole = data.decision === "approved"
      ? "Finance Lead, Northbridge Health Services"
      : "Stakeholder";
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

const ATTENDEE_BOOK: Record<string, Attendee> = {
  pm:        { role_key: "pm",        name: "Sarah Williams",  role: "Project Manager",                       persona: "Senior PM. Direct, pragmatic, slightly impatient with vague status. Pushes for owners and dates." },
  sponsor:   { role_key: "sponsor",   name: "David Okafor",    role: "Executive Sponsor, Director of Transformation", persona: "Outcome-focused. Uses board language. Pushes back on cost and timeline. Will name names." },
  finance:   { role_key: "finance",   name: "Priya Anand",     role: "Finance Lead, Northbridge Health Services", persona: "Spreadsheet-led, sceptical of vendor claims. Wants forecast vs actuals, not narrative." },
  tech:      { role_key: "tech",      name: "James Lin",       role: "Technical Lead",                        persona: "Engineer. Surfaces integration risk and dependency chains. Resists optimistic dates." },
  vendor:    { role_key: "vendor",    name: "CareSoft Ltd",    role: "Vendor — CareSoft (Account Director)",  persona: "Polished, defends vendor commercials. Will offer a workaround before owning a delay." },
  care_home: { role_key: "care_home", name: "Margaret Hollis", role: "Care Home Manager (Willow Lodge)",       persona: "Operational, protective of staff. Speaks plainly. Raises readiness and training concerns." },
  clinical:  { role_key: "clinical",  name: "Rachel Stone",    role: "Clinical Governance Lead",              persona: "Patient-safety first. Will halt go-lives over information governance gaps." },
};

const KIND_ATTENDEES: Record<string, string[]> = {
  standup:  ["pm", "tech", "clinical"],
  steering: ["sponsor", "pm", "finance", "clinical"],
  vendor:   ["vendor", "tech", "pm"],
  retro:    ["pm", "tech", "clinical", "care_home"],
};

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
    const attendees = (KIND_ATTENDEES[data.kind] ?? []).map((k) => ATTENDEE_BOOK[k]);
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
  .handler(async () => Object.values(ATTENDEE_BOOK));

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
    let toAdd: Attendee | undefined;
    if (data.role_key && ATTENDEE_BOOK[data.role_key]) {
      toAdd = ATTENDEE_BOOK[data.role_key];
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
    if (attendees.length === 0) {
      const fresh = (KIND_ATTENDEES[meeting.kind] ?? []).map((k) => ATTENDEE_BOOK[k]);
      await context.supabase.from("meetings").update({ attendees: fresh as unknown as Json }).eq("id", meeting.id);
    }
    // Opening turn: PM (or first attendee) frames the meeting.
    const list = attendees.length ? attendees : (KIND_ATTENDEES[meeting.kind] ?? []).map((k) => ATTENDEE_BOOK[k]);
    const opener = list.find((a) => a.role_key === "pm") ?? list[0];
    if (!opener) return meeting;
    const transcript = transcriptOf(meeting);
    if (transcript.length > 0) return meeting;

    const prompt = `You are ${opener.name}, ${opener.role}. ${opener.persona}
You are opening a ${meeting.kind} meeting titled "${meeting.title}" on the Digital Care Records Rollout (£500k, 6 months, behind schedule).
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
      attendees = (KIND_ATTENDEES[meeting.kind] ?? []).map((k) => ATTENDEE_BOOK[k]);
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

    const prompt = `You are ${speaker.name}, ${speaker.role}, in a live ${meeting.kind} meeting on the Digital Care Records Rollout.
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
      const { text } = await generateText({
        model: getModel(),
        prompt: `Summarise this ${meeting.kind} meeting on the Digital Care Records Rollout in 3-5 bullet points covering decisions, actions (with owners), and unresolved questions. Be terse and workplace-realistic.

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

    const prompt = `Generate ONE email where a stakeholder DISAGREES with another stakeholder or with a recent decision on the Digital Care Records Rollout. This is real-life project tension, not gameplay.

Pick a realistic disagreement, e.g.:
- Finance (Priya Anand) pushes back on the vendor's proposed cost increase
- Clinical Governance (Rachel Stone) objects to the timeline cutting clinical safety review
- Care Home Manager (Margaret Hollis) protests that her home isn't ready and is being rushed
- Technical Lead (James Lin) disputes a sponsor decision that ignores integration risk
- Sponsor (David Okafor) questions why the PM is escalating instead of resolving directly
- Vendor (CareSoft Ltd) refuses to absorb cost of a scope change

Reference real context. Coordinator: ${firstName}. Project health: ${state?.health}. Recent messages: ${JSON.stringify(recentMsgs)}. Recent change requests: ${JSON.stringify(recentCRs)}.

The email should put ${firstName} in the middle and force a judgement call. Address ${firstName} by first name. 2-4 short paragraphs. Sign off.`;

    const { object } = await generateObject({ model: getModel(), schema: Schema, prompt });
    const { data: msg, error } = await supabase
      .from("inbox_messages")
      .insert({ user_id: userId, ...object })
      .select()
      .single();
    if (error) throw error;
    return msg;
  });