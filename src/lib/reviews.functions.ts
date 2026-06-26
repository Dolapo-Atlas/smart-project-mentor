import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { generateObject } from "ai";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";

const MODEL = "google/gemini-3-flash-preview";
function getModel() {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("Missing LOVABLE_API_KEY");
  return createLovableAiGatewayProvider(key)(MODEL);
}

export const listReviews = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("performance_reviews")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  });

export const generatePerformanceReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const { data: state } = await supabase
      .from("simulation_state")
      .select("current_week,reputation,health,phase")
      .eq("user_id", userId)
      .maybeSingle();
    const week = state?.current_week ?? 1;

    // Don't double-create for the same week
    const { data: existing } = await supabase
      .from("performance_reviews")
      .select("id")
      .eq("user_id", userId)
      .eq("week_number", week)
      .maybeSingle();
    if (existing) {
      return { created: false, reviewId: existing.id };
    }

    const [{ data: tasks }, { data: raids }, { data: rels }, { data: docs }] =
      await Promise.all([
        supabase.from("tasks").select("status,priority").eq("user_id", userId),
        supabase
          .from("raid_items")
          .select("status,severity,kind")
          .eq("user_id", userId),
        supabase
          .from("stakeholder_relationships")
          .select("stakeholder_name,sentiment")
          .eq("user_id", userId),
        supabase
          .from("documents")
          .select("status")
          .eq("user_id", userId),
      ]);

    const totalTasks = tasks?.length ?? 0;
    const doneTasks = (tasks ?? []).filter((t) => t.status === "done").length;
    const completion = totalTasks ? Math.round((doneTasks / totalTasks) * 100) : 0;

    const totalRaids = raids?.length ?? 0;
    const closedRaids = (raids ?? []).filter((r) => r.status !== "open").length;
    const raidClosure = totalRaids ? Math.round((closedRaids / totalRaids) * 100) : 100;

    const avgSentiment = (rels ?? []).length
      ? Math.round(
          (rels ?? []).reduce((s, r) => s + (r.sentiment ?? 0), 0) / (rels ?? []).length,
        )
      : 0;

    const submittedDocs = (docs ?? []).filter((d) => d.status !== "pending").length;

    // Heuristic raw scores 0-100
    const rawDelivery = Math.max(0, Math.min(100, Math.round(completion * 0.7 + submittedDocs * 6)));
    const rawStakeholder = Math.max(0, Math.min(100, 50 + avgSentiment));
    const rawDecision = Math.max(0, Math.min(100, Math.round(raidClosure * 0.6 + (state?.reputation ?? 50) * 0.4)));

    const Schema = z.object({
      score_delivery: z.number().int().min(0).max(100),
      score_stakeholder: z.number().int().min(0).max(100),
      score_decision: z.number().int().min(0).max(100),
      overall_score: z.number().int().min(0).max(100),
      narrative: z.string().describe("2-3 paragraphs from Emma Collins, warm but candid."),
      highlights: z.array(z.string()).min(2).max(4),
      improvements: z.array(z.string()).min(2).max(4),
    });

    const grounding = `You are Emma Collins, Programme Manager at Atlas. Write the coordinator's Week ${week} performance review.

Metrics (already computed — use them, don't recompute):
- Task completion: ${completion}% (${doneTasks}/${totalTasks})
- RAID closure: ${raidClosure}% (${closedRaids}/${totalRaids})
- Average stakeholder sentiment: ${avgSentiment} (range -100..100)
- Documents submitted: ${submittedDocs}
- Project health: ${state?.health ?? "amber"}; phase: ${state?.phase ?? "initiation"}; reputation: ${state?.reputation ?? 50}

Raw heuristic scores (use as anchors, adjust ±10 with judgement):
- Delivery: ${rawDelivery}
- Stakeholder: ${rawStakeholder}
- Decision quality: ${rawDecision}

Tone: warm, candid, specific. Address the coordinator as "you". No corporate fluff.
Highlights = what they did well. Improvements = concrete things to try next week.`;

    const { object } = await generateObject({
      model: getModel(),
      schema: Schema,
      prompt: grounding,
    });

    const { data: inserted, error } = await supabase
      .from("performance_reviews")
      .insert({
        user_id: userId,
        week_number: week,
        score_delivery: object.score_delivery,
        score_stakeholder: object.score_stakeholder,
        score_decision: object.score_decision,
        overall_score: object.overall_score,
        narrative: object.narrative,
        highlights: object.highlights,
        improvements: object.improvements,
        reviewer_name: "Emma Collins",
      })
      .select("id")
      .single();
    if (error) throw error;

    return { created: true, reviewId: inserted.id };
  });