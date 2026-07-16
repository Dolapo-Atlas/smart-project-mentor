import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { TEMPLATES, evaluateGenericTemplate, encodeSubmission, type Readiness } from "./templates";

export type LessonsDoc = {
  id: string;
  payload: Record<string, string>;
  completion_pct: number;
  status: "draft" | "submitted" | "approved" | "changes_requested";
  approval_status: "pending" | "approved" | "changes_requested";
  sponsor_comment: string | null;
  version: number;
  linked_task_id: string | null;
  submitted_at: string | null;
  approved_at: string | null;
  updated_at: string;
};

function computeCompletion(payload: Record<string, string>): number {
  const spec = TEMPLATES.lessons_learned.fields;
  const total = spec.reduce((s, f) => s + (f.required ? 2 : 1), 0);
  let earned = 0;
  for (const f of spec) {
    const v = (payload[f.key] ?? "").trim();
    const min = f.minChars ?? 0;
    const ok = v.length >= min && (!f.required || v.length > 0);
    if (ok) earned += f.required ? 2 : 1;
  }
  return Math.round((earned / total) * 100);
}

export const getOrCreateLessons = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ task_id: z.string().uuid().optional() }).parse(d ?? {}),
  )
  .handler(async ({ data, context }): Promise<LessonsDoc> => {
    const { supabase, userId } = context;
    const { data: existing } = await supabase
      .from("lessons_learned_docs")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (existing) {
      if (data.task_id && existing.linked_task_id !== data.task_id) {
        const { data: updated } = await supabase
          .from("lessons_learned_docs")
          .update({ linked_task_id: data.task_id })
          .eq("id", existing.id)
          .select("*")
          .single();
        return updated as LessonsDoc;
      }
      return existing as LessonsDoc;
    }
    const { data: created, error } = await supabase
      .from("lessons_learned_docs")
      .insert({
        user_id: userId,
        linked_task_id: data.task_id ?? null,
        payload: {},
        completion_pct: 0,
      })
      .select("*")
      .single();
    if (error) throw error;
    return created as LessonsDoc;
  });

export const saveLessonsDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        payload: z.record(z.string(), z.string()),
      })
      .parse(d),
  )
  .handler(async ({ data, context }): Promise<LessonsDoc> => {
    const pct = computeCompletion(data.payload);
    const { data: updated, error } = await context.supabase
      .from("lessons_learned_docs")
      .update({
        payload: data.payload,
        completion_pct: pct,
        status: "draft",
      })
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .select("*")
      .single();
    if (error) throw error;
    return updated as LessonsDoc;
  });

export const listLessonsVersions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: doc } = await context.supabase
      .from("lessons_learned_docs")
      .select("id")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!doc) return [];
    const { data } = await context.supabase
      .from("lessons_learned_versions")
      .select("id,version,submitted_at,completion_pct")
      .eq("doc_id", doc.id)
      .order("version", { ascending: false });
    return data ?? [];
  });

export const submitLessons = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: doc } = await supabase
      .from("lessons_learned_docs")
      .select("*")
      .eq("id", data.id)
      .eq("user_id", userId)
      .maybeSingle();
    if (!doc) throw new Error("Lessons doc not found");
    const payload = (doc.payload ?? {}) as Record<string, string>;
    const pct = computeCompletion(payload);
    if (pct < 40) throw new Error("Not ready — complete more required sections first.");

    const nextVersion = (doc.version ?? 1) + (doc.submitted_at ? 1 : 0);

    await supabase.from("lessons_learned_versions").insert({
      doc_id: doc.id,
      user_id: userId,
      version: nextVersion,
      payload,
      completion_pct: pct,
    });

    await supabase
      .from("lessons_learned_docs")
      .update({
        status: "submitted",
        approval_status: "pending",
        submitted_at: new Date().toISOString(),
        version: nextVersion,
        completion_pct: pct,
      })
      .eq("id", doc.id);

    if (doc.linked_task_id) {
      const readiness: Readiness = evaluateGenericTemplate("lessons_learned", payload, {});
      const encoded = encodeSubmission({
        kind: "template",
        template: "lessons_learned",
        values: payload,
        readiness,
      });
      await supabase
        .from("tasks")
        .update({
          status: "submitted",
          submission: encoded,
          submitted_at: new Date().toISOString(),
        })
        .eq("id", doc.linked_task_id)
        .eq("user_id", userId);

      try {
        const { tickChapterBySlug } = await import("@/lib/chapters.functions");
        await tickChapterBySlug(supabase, userId, "closure");
      } catch (e) {
        console.error("lessons chapter tick failed", e);
      }
    }

    try {
      await supabase.from("inbox_messages").insert({
        user_id: userId,
        sender_name: "David Okafor",
        sender_role: "Executive Sponsor",
        subject: `Received: Lessons Learned v${nextVersion}`,
        body:
          `Thanks for the retro — I've received v${nextVersion} of the Lessons Learned (${pct}% complete). I'll circulate to the PMO so the next project inherits what you learned.`,
        tone: "supportive",
        read: false,
      });
    } catch (e) {
      console.error("lessons sponsor inbox insert failed", e);
    }

    return { ok: true, version: nextVersion, completion_pct: pct };
  });