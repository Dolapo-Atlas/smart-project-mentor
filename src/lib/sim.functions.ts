import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { generateText, Output } from "ai";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";

const MODEL = "google/gemini-3-flash-preview";

function getModel() {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("Missing LOVABLE_API_KEY");
  return createLovableAiGatewayProvider(key)(MODEL);
}

/* ---------- READ STATE ---------- */

export const getOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [{ data: state }, { count: unread }, { count: openTasks }, { count: docs }] =
      await Promise.all([
        supabase.from("simulation_state").select("*").eq("user_id", userId).maybeSingle(),
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
    return {
      state: s,
      unread: unread ?? 0,
      openTasks: openTasks ?? 0,
      docs: docs ?? 0,
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
    const { data: recentDocs } = await supabase
      .from("documents")
      .select("title,status,quality_score")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(3);

    const prompt = `You are simulating stakeholders on a cross-functional project called "${state?.project_name ?? "Atlas Initiative"}".
Current phase: ${state?.phase}. Coordinator reputation: ${state?.reputation}/100. Progress: ${state?.progress}/100.
Recent documents: ${JSON.stringify(recentDocs ?? [])}.

Write ONE in-character message from a plausible stakeholder (engineering lead, design director, finance, exec sponsor, client PM, legal, etc.) to the project coordinator (the user). Be specific, reference the phase, ask a pointed question, raise a risk, request a status, or escalate. Keep body 2–4 short paragraphs. Choose a tone that fits.`;

    const { output } = await generateText({
      model: getModel(),
      prompt,
      output: Output.object({ schema: StakeholderSchema }),
    });

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
    z.object({ id: z.string().uuid(), status: z.enum(["todo", "in_progress", "done"]) }).parse(d),
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
    const prompt = `You are a sharp, fair AI reviewer simulating a panel of project stakeholders for the "${state?.project_name}" project (phase: ${state?.phase}).
Review the following document titled "${doc.title}". Score quality 0-100 based on clarity, completeness, alignment to the phase, and risk awareness. Provide strengths, weaknesses, concrete recommendations. The next_phase_message should be a 1-2 sentence in-character narrative beat describing how the project moves forward (or stalls) because of this document.

--- DOCUMENT EXCERPT ---
${excerpt || "(empty / non-text document — judge based on the title and assume minimal content)"}
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
    const phases = ["kickoff", "discovery", "design", "build", "review", "launch"];
    const curIdx = Math.max(0, phases.indexOf(state?.phase ?? "kickoff"));
    const nextPhase =
      newProgress >= ((curIdx + 1) / phases.length) * 100 && curIdx < phases.length - 1
        ? phases[curIdx + 1]
        : state?.phase;

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
        story_log: story,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);

    // Trigger a follow-up stakeholder message reacting to the review
    const tone = output.score >= 75 ? "supportive" : output.score >= 50 ? "curious" : "frustrated";
    await supabase.from("inbox_messages").insert({
      user_id: userId,
      sender_name: "Priya Anand",
      sender_role: "Executive Sponsor",
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