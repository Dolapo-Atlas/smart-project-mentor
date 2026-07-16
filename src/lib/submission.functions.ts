import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { generateObject } from "ai";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";
import { getProjectCtx } from "./pm.functions";
import type { Readiness, ReadinessStatus, TemplateKind } from "./templates";

const MODEL = "google/gemini-3-flash-preview";
function getModel() {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("Missing LOVABLE_API_KEY");
  return createLovableAiGatewayProvider(key)(MODEL);
}

const AiReadinessSchema = z.object({
  score: z.number().int().min(0).max(100),
  strengths: z.array(z.string().max(200)).max(6),
  gaps: z.array(z.string().max(200)).max(6),
  overall: z.string().max(400),
});

function bucket(score: number): ReadinessStatus {
  if (score < 40) return "not_ready";
  if (score < 80) return "needs_improvement";
  return "ready";
}

export const checkSubmissionReadiness = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        task_id: z.string().uuid(),
        template: z.enum(["raid_log", "project_charter", "status_report"]).optional(),
        kind: z.enum(["template", "upload"]),
        values: z.record(z.string(), z.string()).optional(),
        upload_note: z.string().max(2000).optional(),
        upload_document_id: z.string().uuid().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }): Promise<Readiness> => {
    const { supabase, userId } = context;

    const { data: task } = await supabase
      .from("tasks")
      .select("title,description,completion_action,category,linked_area")
      .eq("id", data.task_id)
      .eq("user_id", userId)
      .maybeSingle();

    const pctx = await getProjectCtx(supabase, userId);
    const { data: state } = await supabase
      .from("simulation_state")
      .select("phase,progress,health")
      .eq("user_id", userId)
      .maybeSingle();

    let sourceBlob = "";
    if (data.kind === "template" && data.values) {
      for (const [k, v] of Object.entries(data.values)) {
        if (v && v.trim()) sourceBlob += `\n## ${k}\n${v.trim()}\n`;
      }
    } else if (data.kind === "upload") {
      let title = "";
      if (data.upload_document_id) {
        const { data: doc } = await supabase
          .from("documents")
          .select("title,content_excerpt")
          .eq("id", data.upload_document_id)
          .maybeSingle();
        title = doc?.title ?? "";
        sourceBlob = `Uploaded PDF: ${title}\n${doc?.content_excerpt ?? ""}`;
      }
      if (data.upload_note) sourceBlob += `\n\nNote: ${data.upload_note}`;
    }

    const prompt = `You are a project management mentor scoring a project coordinator's submission for CONTEXTUAL QUALITY. Length alone does not earn points — relevance to the specific project, task and phase does.

Project: ${pctx.name}
${pctx.description ? `Brief: ${pctx.description}` : ""}
Phase: ${state?.phase ?? "execution"}
Current health: ${state?.health ?? "amber"}

Task: ${task?.title ?? "(unknown)"}
Task detail: ${task?.description ?? ""}
What good looks like: ${task?.completion_action ?? ""}
Template used: ${data.template ?? "free-form"}
Submission kind: ${data.kind}

Submission content:
${sourceBlob || "(empty)"}

Score 0-100 on how well this submission would land with the sponsor. Deduct heavily for generic content, missing owners/dates/mitigations, or content that does not reference this specific project. Return concise strengths and gaps the learner can act on.`;

    try {
      const { object } = await generateObject({
        model: getModel(),
        prompt,
        schema: AiReadinessSchema,
      });
      const score = Math.max(0, Math.min(100, object.score));
      const checks = [
        ...object.strengths.map((s) => ({ label: s, ok: true })),
        ...object.gaps.map((g) => ({ label: g, ok: false, hint: g })),
      ];
      return { score, status: bucket(score), checks, source: "ai" };
    } catch (e) {
      return {
        score: 0,
        status: "not_ready",
        source: "ai",
        checks: [{ label: "AI check unavailable — using rules score only.", ok: false }],
      };
    }
  });

/* ---------- Sign & upload helpers ---------- */

export const signSubmissionUploadPath = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ task_id: z.string().uuid(), filename: z.string().max(200) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const safe = data.filename.replace(/[^\w.\-]/g, "_");
    const path = `${context.userId}/task-${data.task_id}/${Date.now()}-${safe}`;
    return { path };
  });

export type SubmissionTemplateHint = TemplateKind | null;