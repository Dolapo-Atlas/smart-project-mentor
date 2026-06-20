import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { generateObject } from "ai";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";
import { unzipSync, strFromU8 } from "fflate";

const MODEL = "google/gemini-3-flash-preview";

function getModel() {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("Missing LOVABLE_API_KEY");
  return createLovableAiGatewayProvider(key)(MODEL);
}

/* ---------- PROFILE / ONBOARDING ---------- */

export const getProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("profiles")
      .select("*")
      .eq("id", context.userId)
      .maybeSingle();
    if (error) throw error;
    return data;
  });

const OnboardingSchema = z.object({
  first_name: z.string().trim().min(1).max(80),
  last_name: z.string().trim().min(1).max(80),
  preferred_name: z.string().trim().max(80).optional().or(z.literal("")),
  country: z.string().trim().min(1).max(80),
  career_goal: z.enum([
    "Project Coordinator",
    "Project Manager",
    "PMO Analyst",
    "Business Analyst",
    "Data Analyst",
    "Scrum Master",
    "Product Owner",
    "Operations Manager",
    "Customer Success Manager",
  ]),
});

export const completeOnboarding = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => OnboardingSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const firstName = data.preferred_name?.trim() || data.first_name;
    const today = new Date().toISOString().slice(0, 10);

    const { error: pErr } = await supabase
      .from("profiles")
      .update({
        first_name: data.first_name,
        last_name: data.last_name,
        preferred_name: data.preferred_name || null,
        country: data.country,
        career_goal: data.career_goal,
        display_name: `${data.first_name} ${data.last_name}`.trim(),
        role: "Project Coordinator",
        company: "Northbridge Health Services",
        manager: "Sarah Williams",
        project_name: "Digital Care Records Rollout",
        start_date: today,
        onboarded: true,
      })
      .eq("id", userId);
    if (pErr) throw pErr;

    // Avoid double-seeding if user retried onboarding
    const { count: existing } = await supabase
      .from("inbox_messages")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);

    if (!existing || existing === 0) {
      await supabase.from("inbox_messages").insert({
        user_id: userId,
        sender_name: "Sarah Williams",
        sender_role: "Project Manager, Northbridge Health Services",
        subject: "Welcome to the Digital Care Records Project",
        tone: "supportive",
        body:
`Hi ${firstName},

Welcome to Northbridge Health Services.

You'll be joining the Digital Care Records Rollout Project as Project Coordinator. You'll be reporting to me, and working alongside our clinical, finance and vendor leads.

I won't sugar-coat it: the project is currently three weeks behind schedule and the sponsor, David Okafor, has requested an update by Friday. Before then I need three deliverables on file:

  1. A Project Charter — scope, objectives, success criteria, governance.
  2. A Stakeholder Register — every internal and external party with interest, influence and engagement plan.
  3. An initial RAID Log — be specific; generic entries will be challenged in governance.

I've added these as tasks in your workspace. Assume you have authority to make sensible decisions and document them — shout if anything is unclear.

Regards,

Sarah Williams
Project Manager
Northbridge Health Services`,
      });

      await supabase.from("tasks").insert([
        {
          user_id: userId,
          title: "Draft Project Charter",
          description: "Scope, objectives, success criteria, assumptions, constraints, governance. Upload as PDF or DOCX.",
          priority: "high",
          status: "todo",
        },
        {
          user_id: userId,
          title: "Create Stakeholder Register",
          description: "Identify all internal and external stakeholders for the 12-care-home rollout. Capture interest, influence, and engagement strategy.",
          priority: "high",
          status: "todo",
        },
        {
          user_id: userId,
          title: "Build initial RAID Log",
          description: "Risks, Assumptions, Issues, Dependencies. Be specific — generic entries will be challenged in the governance meeting.",
          priority: "medium",
          status: "todo",
        },
      ]);
    }

    return { ok: true, first_name: firstName };
  });

/* ---------- READ STATE ---------- */

export const getOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [{ data: state }, { data: profile }, { count: unread }, { count: openTasks }, { count: docs }, { count: pendingReviews }, { data: recentDocs }, { data: recentMsgs }, { data: recentTasks }] =
      await Promise.all([
        supabase.from("simulation_state").select("*").eq("user_id", userId).maybeSingle(),
        supabase.from("profiles").select("first_name,preferred_name,last_name,display_name").eq("id", userId).maybeSingle(),
        supabase
          .from("inbox_messages")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("read", false),
        supabase
          .from("tasks")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId)
          .neq("status", "done"),
        supabase
          .from("documents")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId),
        supabase
          .from("documents")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("status", "pending"),
        supabase
          .from("documents")
          .select("id,title,status,created_at")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("inbox_messages")
          .select("id,subject,sender_name,created_at")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("tasks")
          .select("id,title,status,created_at,completed_at")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(5),
      ]);
    // Ensure state exists (in case trigger didn't run for some reason)
    let s = state;
    if (!s) {
      const ins = await supabase
        .from("simulation_state")
        .insert({ user_id: userId })
        .select()
        .single();
      s = ins.data;
    }
    const activity = [
      ...(recentDocs ?? []).map((d) => ({
        kind: "document" as const,
        id: d.id,
        text: `Uploaded "${d.title}" (${d.status})`,
        at: d.created_at,
      })),
      ...(recentMsgs ?? []).map((m) => ({
        kind: "inbox" as const,
        id: m.id,
        text: `Email from ${m.sender_name}: ${m.subject}`,
        at: m.created_at,
      })),
      ...(recentTasks ?? []).map((t) => ({
        kind: "task" as const,
        id: t.id,
        text: `Task "${t.title}" (${t.status})`,
        at: t.completed_at ?? t.created_at,
      })),
    ]
      .sort((a, b) => +new Date(b.at) - +new Date(a.at))
      .slice(0, 8);
    return {
      state: s,
      profile: profile ?? null,
      unread: unread ?? 0,
      openTasks: openTasks ?? 0,
      docs: docs ?? 0,
      pendingReviews: pendingReviews ?? 0,
      activity,
    };
  });

/* ---------- INBOX ---------- */

export const listInbox = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("inbox_messages")
      .select("*")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    const seen = new Set<string>();
    return (data ?? [])
      .map((message) => ({
        ...message,
        body: personalizePlaceholderReply(message.sender_name, message.body, message.subject),
      }))
      .filter((message) => {
        const key = [message.sender_name, message.subject, message.body].join("\n").toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  });

function personalizePlaceholderReply(sender: string, body: string, subject: string): string {
  if (!body.trim().startsWith("Thanks for the note — I'll come back to you shortly.")) return body;
  if (sender === "Rachel Stone") {
    return `I have picked up your update on "${subject.replace(/^Re:\s*/i, "")}". Before clinical governance can support it, I need the safety impact, approval route, and escalation triggers to be explicit.\n\nRachel Stone`;
  }
  if (sender === "Sarah Williams") {
    return `I have reviewed your update on "${subject.replace(/^Re:\s*/i, "")}". Please turn the key points into dated actions and flag anything that needs sponsor or governance input before Friday.\n\nThanks,\nSarah`;
  }
  return body;
}

export const markRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await context.supabase
      .from("inbox_messages")
      .update({ read: true })
      .eq("id", data.id)
      .eq("user_id", context.userId);
    return { ok: true };
  });

const StakeholderSchema = z.object({
  sender_name: z.string(),
  sender_role: z.string(),
  subject: z.string(),
  body: z.string(),
  tone: z.enum(["urgent", "supportive", "frustrated", "curious", "neutral"]),
});

export const generateStakeholderMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: state } = await supabase
      .from("simulation_state")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    const { data: profile } = await supabase
      .from("profiles")
      .select("first_name, preferred_name, last_name")
      .eq("id", userId)
      .maybeSingle();
    const firstName =
      profile?.preferred_name?.trim() || profile?.first_name || "the coordinator";
    const { data: recentDocs } = await supabase
      .from("documents")
      .select("title,status,quality_score")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(3);

    const prompt = `You are simulating stakeholders on the "${state?.project_name ?? "Digital Care Records Rollout"}" project at ${state?.company ?? "Northbridge Health Services"}.
Project: move 12 care homes from paper-based records to a digital care record platform. Budget £500,000. Timeline 6 months. The project is currently behind schedule.
Current chapter: ${state?.chapter}. Project health: ${state?.health}. Coordinator reputation: ${state?.reputation}/100. Progress: ${state?.progress}/100.
Recent documents from the coordinator: ${JSON.stringify(recentDocs ?? [])}.

The project coordinator's first name is "${firstName}". Address them by this first name in the email body (e.g. "Hi ${firstName},", "Thanks ${firstName}", "${firstName}, I need…"). Do not use generic salutations like "Hi there" or "Hi team".

Write ONE realistic, professional workplace email to ${firstName} (the project coordinator) from ONE of these stakeholders — pick whichever is most plausible given the state:
- Sarah Williams, Project Manager (the coordinator's line manager)
- David Okafor, Executive Sponsor (Director of Transformation)
- Priya Anand, Finance Lead
- James Lin, Technical Lead (digital records platform vendor liaison)
- CareSoft Ltd (the vendor implementing the platform)
- Margaret Hollis, Care Home Manager — Oakwood House
- Rachel Stone, Clinical Governance Lead

Style: like a real workplace email. No game-y language. Reference the rollout, RAID items, status reports, governance, change requests, vendor delays, care-home readiness, or training — whatever fits. Ask a pointed question, request a deliverable, raise a risk, or escalate. 2–4 short paragraphs. Sign off with the sender's name and role.

About half the time, this email should put the coordinator in an awkward position: contradict another stakeholder's recent message, push back on a sponsor decision, escalate over the PM's head, miss a deadline and ask for cover, or demand something Finance/Clinical will object to. Real projects are political — don't make every email supportive.`;

    let output: z.infer<typeof StakeholderSchema>;
    try {
      const res = await generateObject({
        model: getModel(),
        prompt,
        schema: StakeholderSchema,
      });
      output = res.object;
    } catch {
      // Retry once with a stricter instruction; fall back to a safe default.
      try {
        const res = await generateObject({
          model: getModel(),
          prompt: prompt + "\n\nReturn ONLY valid JSON matching the schema. No prose.",
          schema: StakeholderSchema,
        });
        output = res.object;
      } catch {
        output = {
          sender_name: "Sarah Williams",
          sender_role: "Project Manager, Northbridge Health Services",
          subject: "Quick check-in on the rollout",
          body: `Hi ${firstName},\n\nCan you send me a short status update on where we are with the rollout? Particularly the RAID log and any vendor blockers.\n\nThanks,\nSarah`,
          tone: "neutral",
        };
      }
    }

    const { data: msg, error } = await supabase
      .from("inbox_messages")
      .insert({ user_id: userId, ...output })
      .select()
      .single();
    if (error) throw error;
    return msg;
  });

/* ---------- TASKS ---------- */

export const listTasks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("tasks")
      .select("*")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  });

export const createTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      title: z.string().min(1),
      description: z.string().optional(),
      priority: z.enum(["low", "medium", "high"]).default("medium"),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: t, error } = await context.supabase
      .from("tasks")
      .insert({ user_id: context.userId, ...data })
      .select()
      .single();
    if (error) throw error;
    return t;
  });

export const updateTaskStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), status: z.enum(["todo", "in_progress", "submitted", "done"]) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const patch: { status: string; completed_at?: string } = { status: data.status };
    if (data.status === "done") patch.completed_at = new Date().toISOString();
    await context.supabase
      .from("tasks")
      .update(patch)
      .eq("id", data.id)
      .eq("user_id", context.userId);
    // small progress bump on completion
    if (data.status === "done") {
      const { data: s } = await context.supabase
        .from("simulation_state")
        .select("progress")
        .eq("user_id", context.userId)
        .single();
      await context.supabase
        .from("simulation_state")
        .update({ progress: Math.min(100, (s?.progress ?? 0) + 3), updated_at: new Date().toISOString() })
        .eq("user_id", context.userId);
    }
    return { ok: true };
  });

export const deleteTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await context.supabase.from("tasks").delete().eq("id", data.id).eq("user_id", context.userId);
    return { ok: true };
  });

/* ---------- AUTO-ESCALATION ---------- */

const EscalationSchema = z.object({
  subject: z.string(),
  body: z.string(),
  tone: z.enum(["urgent", "frustrated", "neutral"]),
});

export const runEscalations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();

    // Find unread inbound messages older than 2 days that have never been escalated.
    const { data: stale } = await supabase
      .from("inbox_messages")
      .select("id,sender_name,sender_role,subject,body,created_at")
      .eq("user_id", userId)
      .eq("read", false)
      .is("escalated_at", null)
      .lt("created_at", twoDaysAgo)
      .order("created_at", { ascending: true })
      .limit(2);

    if (!stale || stale.length === 0) return { escalated: 0 };

    const { data: profile } = await supabase
      .from("profiles")
      .select("first_name, preferred_name")
      .eq("id", userId)
      .maybeSingle();
    const firstName =
      profile?.preferred_name?.trim() || profile?.first_name || "there";

    let count = 0;
    for (const orig of stale) {
      const daysOld = Math.max(
        2,
        Math.floor((Date.now() - +new Date(orig.created_at)) / 86_400_000),
      );
      const prompt = `You are "${orig.sender_name}, ${orig.sender_role}". You emailed the project coordinator "${firstName}" ${daysOld} days ago about: "${orig.subject}". They have NOT replied. Write a SHORT follow-up email chasing for a response.

Original message body:
${orig.body}

Style: a real chase email. Reference how long it's been. Be professional but show appropriate impatience — sponsors get blunt, finance/clinical sound concerned, vendors deflect, care home managers sound stressed about floor reality. 2-3 short paragraphs max. Sign off with name & role.`;

      let out: z.infer<typeof EscalationSchema>;
      try {
        const res = await generateObject({
          model: getModel(),
          prompt,
          schema: EscalationSchema,
        });
        out = res.object;
      } catch {
        out = {
          subject: `Chasing: ${orig.subject}`,
          body: `Hi ${firstName},\n\nI haven't heard back on the below from ${daysOld} days ago. Can you come back to me today please?\n\n${orig.sender_name}`,
          tone: "urgent",
        };
      }

      await supabase.from("inbox_messages").insert({
        user_id: userId,
        sender_name: orig.sender_name,
        sender_role: orig.sender_role,
        subject: out.subject,
        body: out.body,
        tone: out.tone,
      });

      await supabase
        .from("inbox_messages")
        .update({ escalated_at: new Date().toISOString() })
        .eq("id", orig.id);

      // small reputation hit for being ignored
      const { data: s } = await supabase
        .from("simulation_state")
        .select("reputation")
        .eq("user_id", userId)
        .single();
      await supabase
        .from("simulation_state")
        .update({
          reputation: Math.max(0, (s?.reputation ?? 50) - 2),
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);

      count++;
    }

    return { escalated: count };
  });

/* ---------- DOCUMENTS ---------- */

export const listDocuments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("documents")
      .select("*, ai_feedback(*)")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((doc) => ({
      ...doc,
      ai_feedback: Array.isArray(doc.ai_feedback)
        ? [...doc.ai_feedback].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))
        : doc.ai_feedback,
    }));
  });

export const recordDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      title: z.string().min(1),
      storage_path: z.string(),
      content_excerpt: z.string().optional(),
      mime_type: z.string().optional(),
      size_bytes: z.number().int().nonnegative().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: doc, error } = await context.supabase
      .from("documents")
      .insert({ user_id: context.userId, status: "pending", ...data })
      .select()
      .single();
    if (error) throw error;
    return doc;
  });

const FeedbackSchema = z.object({
  score: z.number().min(0).max(100),
  category_scores: z.object({
    clarity: z.number().min(0).max(100),
    completeness: z.number().min(0).max(100),
    professionalism: z.number().min(0).max(100),
    governance: z.number().min(0).max(100),
  }),
  summary: z.string().default(""),
  strengths: z.array(z.string()).default([]),
  weaknesses: z.array(z.string()).default([]),
  recommendations: z.array(z.string()).default([]),
  next_phase_message: z.string().default(""),
});

const ReviewReactionSchema = z.object({
  sender_name: z.string(),
  sender_role: z.string(),
  subject: z.string(),
  body: z.string(),
  tone: z.enum(["urgent", "supportive", "frustrated", "curious", "neutral"]),
});

function wholeScore(value: unknown, fallback = 50): number {
  const n = typeof value === "number" && Number.isFinite(value) ? value : fallback;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function normalizeFeedback(raw: z.infer<typeof FeedbackSchema>): z.infer<typeof FeedbackSchema> {
  return {
    score: wholeScore(raw.score),
    category_scores: {
      clarity: wholeScore(raw.category_scores?.clarity),
      completeness: wholeScore(raw.category_scores?.completeness),
      professionalism: wholeScore(raw.category_scores?.professionalism),
      governance: wholeScore(raw.category_scores?.governance),
    },
    summary: raw.summary || "The review is complete.",
    strengths: raw.strengths ?? [],
    weaknesses: raw.weaknesses ?? [],
    recommendations: raw.recommendations ?? [],
    next_phase_message: raw.next_phase_message || raw.summary || "The document has been reviewed and the project team is waiting for the next update.",
  };
}

function uniqueStrings(items: unknown[] | undefined, fallback: string[]): string[] {
  const seen = new Set<string>();
  const cleaned = (items ?? [])
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => item.length > 0 && !seen.has(item.toLowerCase()) && seen.add(item.toLowerCase()))
    .slice(0, 4);
  return cleaned.length > 0 ? cleaned : fallback;
}

function scoreSignals(excerpt: string) {
  const text = excerpt.toLowerCase();
  const has = (terms: string[]) => terms.some((term) => text.includes(term));
  const hasDateLike = /\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+20\d{2}\b/.test(text)
    || /\b(q[1-4]|week\s+\d+|month\s+\d+|phase\s+\d+)\b/.test(text);
  const hasNamedAccountability = has(["owner", "accountable", "responsible", "raci"])
    || /\b(project sponsor|project manager|project coordinator|finance lead|technical lead|clinical governance lead|governance board)\b/.test(text)
    || /\b(sponsor|manager|coordinator|lead|board)\s*[:\-]/.test(text);
  return {
    length: excerpt.trim().length,
    hasOwners: hasNamedAccountability,
    hasDates: has(["date", "deadline", "timeline", "milestone", "week", "month", "duration", "target completion", "project start"]) || hasDateLike,
    hasGovernance: has(["governance", "approval", "approved", "decision", "decision rights", "steering", "board", "change control"]),
    hasEscalation: has(["escalation", "escalate", "risk", "raid", "issue", "change request"]),
    hasSuccess: has(["success criteria", "benefit", "objective", "scope", "deliverable"]),
    hasStakeholders: has(["stakeholder", "sponsor", "project manager", "clinical governance", "vendor"]),
    hasBudget: has(["budget", "forecast", "cost", "£", "gbp"]),
    hasScope: has(["in scope", "out of scope", "scope"]),
  };
}

function fallbackFeedback(title: string, excerpt: string): z.infer<typeof FeedbackSchema> {
  const signals = scoreSignals(excerpt);
  const hasSubstance = signals.length > 800;
  const signalCount = [signals.hasOwners, signals.hasDates, signals.hasGovernance, signals.hasEscalation, signals.hasSuccess].filter(Boolean).length;
  const score = hasSubstance ? Math.min(82, 52 + signalCount * 6 + Math.min(8, Math.floor(signals.length / 1200))) : 38;
  const missing = [
    !signals.hasOwners && "named owners/accountability",
    !signals.hasDates && "dates or milestones",
    !signals.hasGovernance && "governance/approval route",
    !signals.hasEscalation && "risk and escalation detail",
    !signals.hasSuccess && "success criteria",
  ].filter(Boolean) as string[];
  return normalizeFeedback({
    score,
    category_scores: {
      clarity: hasSubstance ? Math.min(86, 62 + (signals.hasSuccess ? 8 : 0) + (signals.hasDates ? 5 : 0)) : 40,
      completeness: hasSubstance ? Math.min(86, 48 + signalCount * 7) : 30,
      professionalism: hasSubstance ? Math.min(88, 60 + (signals.hasOwners ? 6 : 0) + (signals.hasDates ? 5 : 0)) : 45,
      governance: hasSubstance ? Math.min(84, 42 + (signals.hasGovernance ? 14 : 0) + (signals.hasEscalation ? 12 : 0) + (signals.hasOwners ? 6 : 0)) : 28,
    },
    summary: missing.length === 0
      ? `${title} now reads as a stronger working charter with clearer accountability, timing, governance, and success measures.`
      : `${title} is moving in the right direction, but the remaining gap is ${missing.slice(0, 2).join(" and ")}.`,
    strengths: hasSubstance
      ? uniqueStrings([
          signals.hasSuccess && "The document explains the intended scope, objectives, or success measures.",
          signals.hasOwners && "Accountability is starting to be tied to named owners or responsible roles.",
          signals.hasDates && "The charter now gives the team a clearer timing or milestone reference.",
          signals.hasGovernance && "Governance and approval expectations are more visible than in a bare draft.",
        ].filter(Boolean) as string[], ["The document gives the project enough context to understand the intended deliverable."])
      : ["The file was received and can be tracked against the project deliverables."],
    weaknesses: missing.length === 0
      ? [
          "The charter covers the core governance content, but individual risks and actions could still be tied to named owners and mitigations.",
          "The timeline is clear at milestone level, but it would be stronger with interim review checkpoints for the rollout.",
        ]
      : uniqueStrings(
          missing.map((item) => `Further detail is still needed on ${item}.`),
          ["The deliverable should connect risks, assumptions, owners, dates, and success criteria more explicitly."],
        ),
    recommendations: missing.length === 0
      ? [
          "Convert the risk list into a simple RAID table with owner, mitigation, due date, and escalation trigger for each item.",
          "Add interim governance checkpoints between project start and target completion so Sarah and David can track readiness before go-live.",
        ]
      : uniqueStrings(
          missing.map((item) => `Add a concise section covering ${item}.`),
          ["Prepare the charter for sponsor review by checking decision rights, approvals, risks, and change control are all explicit."],
        ),
    next_phase_message: missing.length === 0
      ? `Sarah can take ${title} into the next review as a credible baseline, while Rachel will still want the team to test the governance route against live risks.`
      : `Sarah can see progress in ${title}, but Rachel will keep pressing for ${missing.slice(0, 2).join(" and ")} before governance sign-off.`,
  });
}

function reconcileFeedbackWithEvidence(
  aiFeedback: z.infer<typeof FeedbackSchema>,
  evidenceFeedback: z.infer<typeof FeedbackSchema>,
  excerpt: string,
): z.infer<typeof FeedbackSchema> {
  if (!excerpt.trim()) return aiFeedback;
  const signals = scoreSignals(excerpt);
  const allText = [aiFeedback.summary, ...aiFeedback.weaknesses, ...aiFeedback.recommendations].join(" ").toLowerCase();
  const contradictsEvidence = [
    signals.hasOwners && /\b(add|need|needs|missing|lacks|lack|clearer)\b.{0,50}\b(owner|owners|ownership|accountability|responsible)\b/.test(allText),
    signals.hasDates && /\b(add|need|needs|missing|lacks|lack|clearer)\b.{0,50}\b(date|dates|deadline|timeline|milestone)\b/.test(allText),
    signals.hasGovernance && /\b(add|need|needs|missing|lacks|lack|clearer|tighter)\b.{0,60}\b(governance|approval|decision rights|change control)\b/.test(allText),
    signals.hasEscalation && /\b(add|need|needs|missing|lacks|lack|clearer)\b.{0,50}\b(escalation|risk|raid|issue)\b/.test(allText),
  ].some(Boolean);

  if (!contradictsEvidence && aiFeedback.score >= evidenceFeedback.score - 6) return aiFeedback;

  return normalizeFeedback({
    score: Math.max(aiFeedback.score, evidenceFeedback.score),
    category_scores: {
      clarity: Math.max(aiFeedback.category_scores.clarity, evidenceFeedback.category_scores.clarity),
      completeness: Math.max(aiFeedback.category_scores.completeness, evidenceFeedback.category_scores.completeness),
      professionalism: Math.max(aiFeedback.category_scores.professionalism, evidenceFeedback.category_scores.professionalism),
      governance: Math.max(aiFeedback.category_scores.governance, evidenceFeedback.category_scores.governance),
    },
    summary: evidenceFeedback.summary,
    strengths: uniqueStrings([...evidenceFeedback.strengths, ...aiFeedback.strengths], evidenceFeedback.strengths),
    weaknesses: evidenceFeedback.weaknesses,
    recommendations: evidenceFeedback.recommendations,
    next_phase_message: evidenceFeedback.next_phase_message,
  });
}

function buildEvidenceBasedReaction(
  title: string,
  feedback: z.infer<typeof FeedbackSchema>,
  previousCount: number,
): z.infer<typeof ReviewReactionSchema> {
  if (feedback.score >= 78) {
    const sender = previousCount % 2 === 0 ? "Sarah Williams" : "Rachel Stone";
    return sender === "Sarah Williams"
      ? {
          sender_name: "Sarah Williams",
          sender_role: "Project Manager, Northbridge Health Services",
          subject: `Re: ${title}`,
          tone: "supportive",
          body: `${title} is now in much better shape. I can see the project dates, decision rights, change control route, governance board, and success criteria, so this no longer reads like the first draft.\n\nPlease turn the remaining RAID points into named actions with owners, mitigations, and review dates so I can brief David with confidence.\n\nThanks,\nSarah`,
        }
      : {
          sender_name: "Rachel Stone",
          sender_role: "Clinical Governance Lead",
          subject: `Re: ${title}`,
          tone: "supportive",
          body: `This version addresses the governance gap I was worried about: the approval route, escalation path, change control, and decision rights are now visible.\n\nFrom a clinical governance point of view, the next improvement is to make each rollout risk traceable to a mitigation owner and review date before the board pack goes out.\n\nRachel Stone`,
        };
  }
  return {
    sender_name: "Rachel Stone",
    sender_role: "Clinical Governance Lead",
    subject: `Re: ${title}`,
    tone: feedback.score >= 50 ? "curious" : "frustrated",
    body: `I can see progress in ${title}, but the latest review still leaves some assurance gaps.\n\nPlease address the open recommendations directly and show who owns each action, when it is due, and when it escalates.\n\nRachel Stone`,
  };
}

async function extractTextFromStorage(
  supabase: { storage: { from: (b: string) => { download: (p: string) => Promise<{ data: Blob | null; error: unknown }> } } },
  path: string,
  mime: string | null,
): Promise<string> {
  try {
    const { data, error } = await supabase.storage.from("project-documents").download(path);
    if (error || !data) return "";
    const buf = new Uint8Array(await data.arrayBuffer());
    const isDocx = mime?.includes("wordprocessingml") || /\.docx$/i.test(path);
    const isXlsx = mime?.includes("spreadsheetml") || /\.xlsx$/i.test(path);
    const isPptx = mime?.includes("presentationml") || /\.pptx$/i.test(path);
    if (isDocx || isXlsx || isPptx) {
      const files = unzipSync(buf);
      const targets = isDocx
        ? ["word/document.xml"]
        : isXlsx
          ? ["xl/sharedStrings.xml"]
          : Object.keys(files).filter((k) => /^ppt\/slides\/slide\d+\.xml$/.test(k));
      let text = "";
      for (const t of targets) {
        if (files[t]) text += " " + strFromU8(files[t]);
      }
      return text
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 8000);
    }
    if (mime?.startsWith("text/")) {
      return strFromU8(buf).slice(0, 8000);
    }
    return "";
  } catch {
    return "";
  }
}

export const reviewDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ document_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: doc } = await supabase
      .from("documents")
      .select("*")
      .eq("id", data.document_id)
      .eq("user_id", userId)
      .single();
    if (!doc) throw new Error("Document not found");
    const { data: state } = await supabase
      .from("simulation_state")
      .select("*")
      .eq("user_id", userId)
      .single();
    const [{ data: previousFeedback }, { data: recentInbox }] = await Promise.all([
      supabase
        .from("ai_feedback")
        .select("score,summary,recommendations,created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(4),
      supabase
        .from("inbox_messages")
        .select("sender_name,subject,body")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

    let excerpt = (doc.content_excerpt ?? "").slice(0, 6000);
    if (!excerpt) {
      excerpt = await extractTextFromStorage(supabase, doc.storage_path, doc.mime_type);
      if (excerpt) {
        await supabase
          .from("documents")
          .update({ content_excerpt: excerpt })
          .eq("id", doc.id);
      }
    }
    const signals = scoreSignals(excerpt);
    const prompt = `You are a senior PMO reviewer at ${state?.company ?? "Northbridge Health Services"} assessing a project coordinator's deliverable on the "${state?.project_name}" project (chapter: ${state?.chapter}; phase: ${state?.phase}). Budget £500,000, 6-month timeline, currently behind schedule. The 12-care-home digital records rollout is the context.

Document title: "${doc.title}". Treat this as a workplace deliverable (e.g. Project Charter, Stakeholder Register, RAID Log, Status Report, Meeting Minutes, Change Request) and review it the way a sponsor or governance board would.

Recent previous reviews in this workspace: ${JSON.stringify(previousFeedback ?? [])}.
Current document signals detected by the app: ${JSON.stringify(signals)}.

If this is a re-upload or re-review, assess the CURRENT excerpt only. Do not repeat an earlier score, summary, weakness, or recommendation unless the current excerpt genuinely still lacks the same evidence. If the current charter now includes owners, dates, governance, escalation paths, or success criteria, acknowledge that improvement and adjust the score upward.

Score the overall quality 0–100, and ALSO score these four sub-categories 0–100:
- clarity (is it easy to read; structure, language, headings)
- completeness (does it actually cover what this artefact must cover; success criteria, assumptions, risks, stakeholders, dates, owners)
- professionalism (tone, formatting, fit for sharing with a sponsor)
- governance (RAID discipline, escalation paths, decision rights, traceability)

Give 2-4 strengths, 2-4 weaknesses, and 2-4 concrete recommendations — all written like real workplace feedback ("Risks are listed but mitigations and owners are missing for R3 and R5"), not platitudes. next_phase_message should be a 1–2 sentence narrative beat describing how the project moves forward (or stalls) because of this document.

--- DOCUMENT EXCERPT ---
${excerpt || "(non-text document — judge based on the title; assume minimal content was provided and the coordinator must resubmit with substance)"}
--- END ---`;

    let output: z.infer<typeof FeedbackSchema>;
    try {
      const res = await generateObject({
        model: getModel(),
        prompt,
        schema: FeedbackSchema,
      });
      output = normalizeFeedback(res.object);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes("402") || message.toLowerCase().includes("credit")) {
        throw new Error("AI credits are exhausted. Add credits to the workspace, then request the review again.");
      }
      if (message.includes("429") || message.toLowerCase().includes("rate limit")) {
        throw new Error("AI review is rate-limited right now. Please retry in a moment.");
      }
      output = fallbackFeedback(doc.title, excerpt);
    }

    await supabase
      .from("documents")
      .update({ status: "reviewed", quality_score: output.score })
      .eq("id", doc.id);

    const { data: fb } = await supabase
      .from("ai_feedback")
      .insert({
        user_id: userId,
        document_id: doc.id,
        score: output.score,
        category_scores: output.category_scores,
        summary: output.summary,
        strengths: output.strengths,
        weaknesses: output.weaknesses,
        recommendations: output.recommendations,
      })
      .select()
      .single();

    // Advance project state based on score
    const delta = Math.round((output.score - 50) / 5); // -10..+10
    const newProgress = Math.max(0, Math.min(100, (state?.progress ?? 0) + Math.max(2, delta)));
    const newReputation = Math.max(0, Math.min(100, (state?.reputation ?? 50) + delta));
    const phases = ["initiation", "planning", "execution", "monitoring", "closure"];
    const curIdx = Math.max(0, phases.indexOf(state?.phase ?? "initiation"));
    const nextPhase =
      newProgress >= ((curIdx + 1) / phases.length) * 100 && curIdx < phases.length - 1
        ? phases[curIdx + 1]
        : state?.phase;

    // Roll category scores into running performance averages
    const prevPerf = (state?.performance ?? {}) as Record<string, number>;
    const mix = (prev: number | undefined, next: number) =>
      Math.round(((prev ?? 50) * 2 + next) / 3);
    const newPerf = {
      documentation: mix(prevPerf.documentation, output.category_scores.completeness),
      stakeholder: mix(prevPerf.stakeholder, output.category_scores.clarity),
      governance: mix(prevPerf.governance, output.category_scores.governance),
      risk: mix(prevPerf.risk, Math.round((output.category_scores.governance + output.category_scores.completeness) / 2)),
      communication: mix(prevPerf.communication, output.category_scores.professionalism),
    };
    const newHealth = newReputation >= 70 ? "green" : newReputation >= 45 ? "amber" : "red";

    const story = Array.isArray(state?.story_log) ? state!.story_log : [];
    story.push({
      at: new Date().toISOString(),
      phase: nextPhase,
      score: output.score,
      doc: doc.title,
      beat: output.next_phase_message,
    });

    await supabase
      .from("simulation_state")
      .update({
        progress: newProgress,
        reputation: newReputation,
        phase: nextPhase,
        health: newHealth,
        performance: newPerf,
        story_log: story,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);

    // Trigger a follow-up stakeholder reply reacting to this specific review, not a canned repeat.
    let reaction: z.infer<typeof ReviewReactionSchema>;
    try {
      const res = await generateObject({
        model: getModel(),
        schema: ReviewReactionSchema,
        prompt: `Write ONE short workplace email reacting to the latest document review.

Document: ${doc.title}
Latest score: ${output.score}/100
Latest summary: ${output.summary}
Strengths: ${JSON.stringify(output.strengths)}
Weaknesses: ${JSON.stringify(output.weaknesses)}
Recommendations: ${JSON.stringify(output.recommendations)}
Detected current-document signals: ${JSON.stringify(signals)}
Recent inbox messages to avoid repeating: ${JSON.stringify(recentInbox ?? [])}

Choose the most plausible sender from Sarah Williams (Project Manager), Rachel Stone (Clinical Governance Lead), or David Okafor (Executive Sponsor). If Rachel writes, focus on clinical governance and safety assurance. If Sarah writes, focus on delivery process and next steps. If David writes, focus on sponsor confidence and decision readiness.

Do not use the same wording as any recent inbox message. Do not write a generic "Thanks for the note" response. Mention at least one concrete thing that changed or still needs action. 2 short paragraphs plus sign-off.`,
      });
      reaction = res.object;
    } catch {
      reaction = output.score >= 75
        ? {
            sender_name: "Sarah Williams",
            sender_role: "Project Manager, Northbridge Health Services",
            subject: `Re: ${doc.title}`,
            tone: "supportive",
            body: `This is a stronger version of ${doc.title}. The added ownership and review detail gives us a better baseline for the next governance conversation, so please now turn the open recommendations into dated actions.\n\nThanks,\nSarah`,
          }
        : {
            sender_name: "Rachel Stone",
            sender_role: "Clinical Governance Lead",
            subject: `Re: ${doc.title}`,
            tone: output.score >= 50 ? "curious" : "frustrated",
            body: `I can see the charter has moved on, but I still need the governance route to be unambiguous before this is treated as ready. Please tie the remaining recommendations to owners, dates, and escalation triggers.\n\nRachel Stone`,
          };
    }
    const recentBodies = new Set((recentInbox ?? []).map((m) => m.body.trim().toLowerCase()));
    if (recentBodies.has(reaction.body.trim().toLowerCase())) {
      reaction = {
        ...reaction,
        body: `${reaction.body}\n\nPlease treat this as feedback on the latest review rather than a repeat of the earlier response.`,
      };
    }
    await supabase.from("inbox_messages").insert({
      user_id: userId,
      sender_name: reaction.sender_name,
      sender_role: reaction.sender_role,
      subject: reaction.subject || `Re: ${doc.title}`,
      tone: reaction.tone,
      body: reaction.body,
    });

    return fb;
  });

export const signedDocUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ path: z.string() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: signed, error } = await context.supabase.storage
      .from("project-documents")
      .createSignedUrl(data.path, 60 * 10);
    if (error) throw error;
    return signed;
  });