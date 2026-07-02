import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { generateObject } from "ai";
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

const ATLAS_CONTEXT = `You are the in-house marketing strategist for Atlas — a platform where professionals learn by managing realistic projects (not by watching videos). Positioning: "Experience the workplace before you're in it. Learn by doing. Not by watching." Flagship simulation: Digital Care Records (DCR) — a UK healthcare CRM rollout the learner runs end-to-end as project coordinator. Audience: early-career PMs, career switchers, ops/analyst grads, bootcamp finishers, L&D leads at consultancies and NHS trusts. Tone: confident, calm, senior. No hype, no emojis unless asked. British English. Reference concrete DCR moments (stakeholder pushback, weekly status to David the sponsor, RAID log, kickoff gate) rather than generic PM theory.`;

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

function promptFor(
  kind: z.infer<typeof KindSchema>,
  brief: string,
  channel?: string,
  audience?: string,
) {
  const base = `${ATLAS_CONTEXT}\n\nBrief from the founder:\n${brief}\n\n${
    channel ? `Primary channel: ${channel}\n` : ""
  }${audience ? `Audience focus: ${audience}\n` : ""}`;
  if (kind === "content") {
    return `${base}\nWrite a single, publish-ready piece of marketing content for Atlas. Give a strong hook, a body in markdown, a specific CTA, 5-8 relevant hashtags, and 3 short variations (short-form, long-form, contrarian).`;
  }
  if (kind === "distribution") {
    return `${base}\nDesign a distribution plan for Atlas. Choose 4-6 channels the audience actually uses, set cadence, give the specific angle per channel, and draft a first post per channel. Add a repurposing plan (how one asset becomes many) and 3-5 KPIs.`;
  }
  if (kind === "ads") {
    return `${base}\nProduce 4-6 ad variants across Google Search, Meta (Instagram/Facebook), LinkedIn and TikTok as fits the brief. Each ad: platform, headline (respect platform limits), primary text, description, CTA, and targeting audience. Include short platform_notes on why the mix.`;
  }
  return `${base}\nBuild a complete mini campaign: name, one-paragraph narrative, one hero content piece, distribution plan, and ad variants. Everything must feel like one coherent story.`;
}

export const generateMarketing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      kind: z.infer<typeof KindSchema>;
      title: string;
      brief: string;
      channel?: string;
      audience?: string;
    }) => input,
  )
  .handler(async ({ data, context }) => {
    if (!isAdmin(context.claims)) throw new Response("Forbidden", { status: 403 });
    const kind = KindSchema.parse(data.kind);
    const brief = (data.brief ?? "").trim();
    if (brief.length < 5) throw new Error("Brief is too short.");

    const { object } = await generateObject({
      model: model(),
      schema: schemaFor(kind) as any,
      prompt: promptFor(kind, brief, data.channel, data.audience),
    });

    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("marketing_assets")
      .insert({
        user_id: userId,
        kind,
        title: data.title?.trim() || `${kind} — ${new Date().toLocaleDateString()}`,
        brief,
        channel: data.channel ?? null,
        audience: data.audience ?? null,
        content: object,
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