import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { generateObject, generateText } from "ai";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";

const ADMIN_EMAILS = ["rasaqdolapo@gmail.com", "fuhad.dolapo@gmail.com"];
function isAdmin(claims: any) {
  return ADMIN_EMAILS.includes((claims?.email ?? "").toString().toLowerCase());
}

function model() {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("Missing LOVABLE_API_KEY");
  return createLovableAiGatewayProvider(key)("google/gemini-3-flash-preview");
}

const ATLAS_BRAIN = `You are the Head of Marketing for Atlas — you are not a prompt box, you are a senior operator who already knows the brand better than any new employee.

ATLAS — WHAT IT IS
Atlas is a workplace simulation platform. People step into realistic projects and run them end-to-end before they ever enter the workplace.

MISSION
Help people build professional memory before they enter the workplace.

CORE PHILOSOPHY
Learn by doing. Not by watching.

CORE POSITIONING
Experience the workplace before you are in it.

PREFERRED MESSAGING (weave naturally — never list all at once)
- Real projects. Real decisions. Real growth.
- Professional memory.
- Workplace confidence.
- Experience before employment.
- The workplace shouldn't be the first place you learn how to work.

FLAGSHIP SIMULATION
Digital Care Records (DCR) — a UK healthcare CRM rollout the learner runs as project coordinator: kickoff, charter, stakeholder mapping, RAID log, weekly status to David the sponsor, pushback from clinicians, phase gates, closure.

AUDIENCE
Early-career PMs, career switchers, ops/analyst grads, bootcamp finishers, and L&D leaders at consultancies and NHS-style organisations.

VOICE
Premium. Thought-provoking. Minimal. Confident. Never overly salesy. British English. No hype, no emoji unless explicitly asked. Short sentences do heavy lifting. Every line earns its place.

RULES
- Never explain Atlas from scratch — write as if the reader is already curious.
- Never use generic PM theory when a concrete DCR moment will land harder.
- Never sound like a course platform. Atlas is not courses, videos, or lectures.
- Never write "unlock", "supercharge", "revolutionise", "game-changer".
- Prefer specificity over cleverness.`;

const KindSchema = z.enum(["content", "distribution", "ads", "campaign"]);

const ContentSchema = z.object({
  title: z.string(),
  hook: z.string(),
  body_markdown: z.string(),
  cta: z.string(),
  hashtags: z.array(z.string()),
  variations: z.array(z.object({ label: z.string(), text: z.string() })),
});

const DistributionSchema = z.object({
  summary: z.string(),
  channels: z.array(
    z.object({
      channel: z.string(),
      cadence: z.string(),
      angle: z.string(),
      first_post: z.string(),
    }),
  ),
  repurpose_plan: z.array(z.string()),
  kpis: z.array(z.string()),
});

const AdsSchema = z.object({
  platform_notes: z.string(),
  ads: z.array(
    z.object({
      platform: z.string(),
      headline: z.string(),
      primary_text: z.string(),
      description: z.string(),
      cta: z.string(),
      audience: z.string(),
    }),
  ),
});

const CampaignSchema = z.object({
  campaign_name: z.string(),
  narrative: z.string(),
  content: ContentSchema,
  distribution: DistributionSchema,
  ads: AdsSchema,
});

function schemaFor(kind: z.infer<typeof KindSchema>) {
  if (kind === "content") return ContentSchema;
  if (kind === "distribution") return DistributionSchema;
  if (kind === "ads") return AdsSchema;
  return CampaignSchema;
}

function briefBlock(opts: {
  campaign?: string;
  platform?: string;
  assetType?: string;
  tone?: string;
  channel?: string;
  audience?: string;
  prompt: string;
  recentTitles?: string[];
}) {
  const lines = [
    opts.campaign ? `Campaign: ${opts.campaign}` : "",
    opts.platform ? `Platform: ${opts.platform}` : "",
    opts.assetType ? `Asset type: ${opts.assetType}` : "",
    opts.tone ? `Tone: ${opts.tone}` : "",
    opts.channel ? `Primary channel: ${opts.channel}` : "",
    opts.audience ? `Audience focus: ${opts.audience}` : "",
  ].filter(Boolean).join("\n");
  const memory = opts.recentTitles?.length
    ? `\n\nRecent Atlas marketing you've already shipped (avoid repeating angles):\n- ${opts.recentTitles.slice(0, 12).join("\n- ")}`
    : "";
  return `${ATLAS_BRAIN}\n\n${lines}\n\nFounder's brief:\n${opts.prompt}${memory}`;
}

function promptFor(
  kind: z.infer<typeof KindSchema>,
  base: string,
) {
  if (kind === "content") {
    return `${base}\n\nWrite a single, publish-ready Atlas piece. Give a strong hook (one line, no cliché), a body in markdown that matches the requested asset type and platform, a specific CTA, 5-8 relevant hashtags, and 3 short variations (short-form, long-form, contrarian).`;
  }
  if (kind === "distribution") {
    return `${base}\n\nDesign a distribution plan for Atlas. Choose 4-6 channels the audience actually uses, set cadence, give the specific angle per channel, and draft a first post per channel. Add a repurposing plan (how one asset becomes many) and 3-5 KPIs.`;
  }
  if (kind === "ads") {
    return `${base}\n\nProduce 4-6 ad variants across Google Search, Meta (Instagram/Facebook), LinkedIn and TikTok as fits the brief. Each ad: platform, headline (respect platform limits), primary text, description, CTA, and targeting audience. Include short platform_notes on why the mix.`;
  }
  return `${base}\n\nBuild a complete mini campaign: name, one-paragraph narrative, one hero content piece, distribution plan, and ad variants. Everything must feel like one coherent story.`;
}

export const generateMarketing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      kind: z.infer<typeof KindSchema>;
      title: string;
      brief: string;
      campaign?: string;
      platform?: string;
      assetType?: string;
      tone?: string;
      channel?: string;
      audience?: string;
    }) => input,
  )
  .handler(async ({ data, context }) => {
    if (!isAdmin(context.claims)) throw new Response("Forbidden", { status: 403 });
    const kind = KindSchema.parse(data.kind);
    const brief = (data.brief ?? "").trim();
    if (brief.length < 5) throw new Error("Brief is too short.");

    const { supabase, userId } = context;
    // pull last 12 titles to give the AI memory of what's already been made
    const { data: recent } = await supabase
      .from("marketing_assets")
      .select("title,campaign")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(12);
    const recentTitles = (recent ?? []).map((r: any) =>
      r.campaign ? `[${r.campaign}] ${r.title}` : r.title,
    );

    const base = briefBlock({
      campaign: data.campaign,
      platform: data.platform,
      assetType: data.assetType,
      tone: data.tone,
      channel: data.channel,
      audience: data.audience,
      prompt: brief,
      recentTitles,
    });

    const { object } = await generateObject({
      model: model(),
      schema: schemaFor(kind) as any,
      prompt: promptFor(kind, base),
    });

    const { data: row, error } = await supabase
      .from("marketing_assets")
      .insert({
        user_id: userId,
        kind,
        title: data.title?.trim() || `${kind} — ${new Date().toLocaleDateString()}`,
        brief,
        prompt: brief,
        campaign: data.campaign ?? null,
        platform: data.platform ?? null,
        asset_type: data.assetType ?? null,
        tone: data.tone ?? null,
        channel: data.channel ?? null,
        audience: data.audience ?? null,
        content: object as any,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const listMarketing = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    if (!isAdmin(context.claims)) throw new Response("Forbidden", { status: 403 });
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("marketing_assets")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const deleteMarketing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }) => {
    if (!isAdmin(context.claims)) throw new Response("Forbidden", { status: 403 });
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("marketing_assets")
      .delete()
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const duplicateMarketing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }) => {
    if (!isAdmin(context.claims)) throw new Response("Forbidden", { status: 403 });
    const { supabase, userId } = context;
    const { data: src, error: e1 } = await supabase
      .from("marketing_assets").select("*").eq("id", data.id).eq("user_id", userId).single();
    if (e1 || !src) throw new Error(e1?.message ?? "Not found");
    const { id, created_at, updated_at, ...rest } = src as any;
    const { data: row, error } = await supabase
      .from("marketing_assets")
      .insert({ ...rest, title: `${src.title} (copy)` })
      .select("*").single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updateMarketing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; title?: string; content?: any; tags?: string[] }) => input)
  .handler(async ({ data, context }) => {
    if (!isAdmin(context.claims)) throw new Response("Forbidden", { status: 403 });
    const { supabase, userId } = context;
    const patch: any = { updated_at: new Date().toISOString() };
    if (data.title !== undefined) patch.title = data.title;
    if (data.content !== undefined) patch.content = data.content;
    if (data.tags !== undefined) patch.tags = data.tags;
    const { data: row, error } = await supabase
      .from("marketing_assets").update(patch).eq("id", data.id).eq("user_id", userId).select("*").single();
    if (error) throw new Error(error.message);
    return row;
  });

const IdeasSchema = z.object({
  ideas: z.array(z.object({
    title: z.string(),
    platform: z.string(),
    asset_type: z.string(),
    hook: z.string(),
    why_it_works: z.string(),
  })).min(10),
});

export const generateIdeas = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { theme?: string; count?: number }) => input)
  .handler(async ({ data, context }) => {
    if (!isAdmin(context.claims)) throw new Response("Forbidden", { status: 403 });
    const { supabase, userId } = context;
    const { data: recent } = await supabase
      .from("marketing_assets").select("title,campaign,platform,asset_type")
      .eq("user_id", userId).order("created_at", { ascending: false }).limit(30);
    const already = (recent ?? []).map((r: any) => `- ${r.title} (${r.platform ?? "?"} / ${r.asset_type ?? "?"})`).join("\n");
    const count = Math.max(10, Math.min(30, data.count ?? 20));
    const { object } = await generateObject({
      model: model(),
      schema: IdeasSchema as any,
      prompt: `${ATLAS_BRAIN}\n\nGenerate ${count} fresh Atlas content ideas${
        data.theme ? ` on the theme: ${data.theme}` : ""
      }. Do NOT repeat these already-shipped titles:\n${already || "(none yet)"}\n\nEach idea: a specific title, the best platform, the asset type, a one-line hook, and why it works.`,
    });
    return object;
  });

const SwipeAnalysisSchema = z.object({
  what_makes_it_work: z.array(z.string()),
  atlas_version: z.object({
    hook: z.string(),
    body_markdown: z.string(),
    platform: z.string(),
    asset_type: z.string(),
  }),
});

export const analyseSwipe = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { title: string; source?: string; notes?: string; imageUrl?: string }) => input)
  .handler(async ({ data, context }) => {
    if (!isAdmin(context.claims)) throw new Response("Forbidden", { status: 403 });
    const { supabase, userId } = context;
    const { object } = await generateObject({
      model: model(),
      schema: SwipeAnalysisSchema as any,
      prompt: `${ATLAS_BRAIN}\n\nSwipe file entry to analyse.\nTitle: ${data.title}\nSource: ${data.source ?? "unknown"}\nFounder notes: ${data.notes ?? "(none)"}\n${data.imageUrl ? `Image URL: ${data.imageUrl}` : ""}\n\nList what makes the reference work, then produce an Atlas-native version (hook + body markdown + best platform + asset type).`,
    });
    const { data: row, error } = await supabase.from("swipe_files").insert({
      user_id: userId,
      title: data.title,
      source: data.source ?? null,
      image_url: data.imageUrl ?? null,
      notes: data.notes ?? null,
      analysis: object as any,
    }).select("*").single();
    if (error) throw new Error(error.message);
    return row;
  });

export const listSwipes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    if (!isAdmin(context.claims)) throw new Response("Forbidden", { status: 403 });
    const { supabase, userId } = context;
    const { data, error } = await supabase.from("swipe_files").select("*").eq("user_id", userId).order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const deleteSwipe = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }) => {
    if (!isAdmin(context.claims)) throw new Response("Forbidden", { status: 403 });
    const { supabase, userId } = context;
    const { error } = await supabase.from("swipe_files").delete().eq("id", data.id).eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });