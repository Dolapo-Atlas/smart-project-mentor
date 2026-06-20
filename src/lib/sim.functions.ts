import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { generateText, generateObject, Output } from "ai";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";

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
    return data ?? [];
  });

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

Style: like a real workplace email. No game-y language. Reference the rollout, RAID items, status reports, governance, change requests, vendor delays, care-home readiness, or training — whatever fits. Ask a pointed question, request a deliverable, raise a risk, or escalate. 2–4 short paragraphs. Sign off with the sender's name and role.`;

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
    return data ?? [];
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
  score: z.number().int().min(0).max(100),
  category_scores: z.object({
    clarity: z.number().int().min(0).max(100),
    completeness: z.number().int().min(0).max(100),
    professionalism: z.number().int().min(0).max(100),
    governance: z.number().int().min(0).max(100),
  }),
  summary: z.string(),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  recommendations: z.array(z.string()),
  next_phase_message: z.string(),
});

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

    const excerpt = (doc.content_excerpt ?? "").slice(0, 6000);
    const prompt = `You are a senior PMO reviewer at ${state?.company ?? "Northbridge Health Services"} assessing a project coordinator's deliverable on the "${state?.project_name}" project (chapter: ${state?.chapter}; phase: ${state?.phase}). Budget £500,000, 6-month timeline, currently behind schedule. The 12-care-home digital records rollout is the context.

Document title: "${doc.title}". Treat this as a workplace deliverable (e.g. Project Charter, Stakeholder Register, RAID Log, Status Report, Meeting Minutes, Change Request) and review it the way a sponsor or governance board would.

Score the overall quality 0–100, and ALSO score these four sub-categories 0–100:
- clarity (is it easy to read; structure, language, headings)
- completeness (does it actually cover what this artefact must cover; success criteria, assumptions, risks, stakeholders, dates, owners)
- professionalism (tone, formatting, fit for sharing with a sponsor)
- governance (RAID discipline, escalation paths, decision rights, traceability)

Give 2-4 strengths, 2-4 weaknesses, and 2-4 concrete recommendations — all written like real workplace feedback ("Risks are listed but mitigations and owners are missing for R3 and R5"), not platitudes. next_phase_message should be a 1–2 sentence narrative beat describing how the project moves forward (or stalls) because of this document.

--- DOCUMENT EXCERPT ---
${excerpt || "(non-text document — judge based on the title; assume minimal content was provided and the coordinator must resubmit with substance)"}
--- END ---`;

    const { output } = await generateText({
      model: getModel(),
      prompt,
      output: Output.object({ schema: FeedbackSchema }),
    });

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

    // Trigger a follow-up stakeholder reply reacting to the review
    const tone = output.score >= 75 ? "supportive" : output.score >= 50 ? "curious" : "frustrated";
    const sender = output.score >= 75
      ? { name: "Sarah Williams", role: "Project Manager, Northbridge Health Services" }
      : output.score >= 50
        ? { name: "Rachel Stone", role: "Clinical Governance Lead" }
        : { name: "David Okafor", role: "Executive Sponsor, Director of Transformation" };
    await supabase.from("inbox_messages").insert({
      user_id: userId,
      sender_name: sender.name,
      sender_role: sender.role,
      subject: `Re: ${doc.title}`,
      tone,
      body: output.next_phase_message,
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