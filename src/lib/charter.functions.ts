import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { TEMPLATES, evaluateCharter, encodeSubmission, type Readiness } from "./templates";

export type CharterRow = {
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
  const spec = TEMPLATES.project_charter.fields;
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

/** Get the current draft (creates one if none exists). */
export const getOrCreateCharter = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ task_id: z.string().uuid().optional() }).parse(d ?? {}),
  )
  .handler(async ({ data, context }): Promise<CharterRow> => {
    const { supabase, userId } = context;
    const { data: existing } = await supabase
      .from("project_charters")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (existing) {
      if (data.task_id && existing.linked_task_id !== data.task_id) {
        const { data: updated } = await supabase
          .from("project_charters")
          .update({ linked_task_id: data.task_id })
          .eq("id", existing.id)
          .select("*")
          .single();
        return updated as CharterRow;
      }
      return existing as CharterRow;
    }
    const { data: created, error } = await supabase
      .from("project_charters")
      .insert({
        user_id: userId,
        linked_task_id: data.task_id ?? null,
        payload: {},
        completion_pct: 0,
      })
      .select("*")
      .single();
    if (error) throw error;
    return created as CharterRow;
  });

export const saveCharterDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        payload: z.record(z.string(), z.string()),
      })
      .parse(d),
  )
  .handler(async ({ data, context }): Promise<CharterRow> => {
    const pct = computeCompletion(data.payload);
    const { data: updated, error } = await context.supabase
      .from("project_charters")
      .update({
        payload: data.payload,
        completion_pct: pct,
        // Editing after a submission goes back to draft
        status: "draft",
      })
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .select("*")
      .single();
    if (error) throw error;
    return updated as CharterRow;
  });

export const listCharterVersions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: charter } = await context.supabase
      .from("project_charters")
      .select("id")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!charter) return [];
    const { data } = await context.supabase
      .from("project_charter_versions")
      .select("id,version,submitted_at,completion_pct")
      .eq("charter_id", charter.id)
      .order("version", { ascending: false });
    return data ?? [];
  });

export const submitCharter = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: charter } = await supabase
      .from("project_charters")
      .select("*")
      .eq("id", data.id)
      .eq("user_id", userId)
      .maybeSingle();
    if (!charter) throw new Error("Charter not found");
    const payload = (charter.payload ?? {}) as Record<string, string>;
    const pct = computeCompletion(payload);
    if (pct < 40) throw new Error("Charter is not ready — complete more required sections first.");

    const nextVersion = (charter.version ?? 1) + (charter.submitted_at ? 1 : 0);

    // Snapshot version
    await supabase.from("project_charter_versions").insert({
      charter_id: charter.id,
      user_id: userId,
      version: nextVersion,
      payload,
      completion_pct: pct,
    });

    // Update charter
    await supabase
      .from("project_charters")
      .update({
        status: "submitted",
        approval_status: "pending",
        submitted_at: new Date().toISOString(),
        version: nextVersion,
        completion_pct: pct,
      })
      .eq("id", charter.id);

    // If linked to a task, submit it through the existing pipeline so
    // task board + feedback + phase progress all react automatically.
    if (charter.linked_task_id) {
      const readiness: Readiness = evaluateCharter(payload, {});
      const encoded = encodeSubmission({
        kind: "template",
        template: "project_charter",
        values: payload,
        readiness,
      });
      const { submitTaskWithWork } = await import("@/lib/tasks.functions");
      // Call the underlying server fn logic in-process by invoking the same
      // supabase mutation the fn performs, so we don't recursively RPC.
      await supabase
        .from("tasks")
        .update({
          status: "submitted",
          submission: encoded,
          submitted_at: new Date().toISOString(),
        })
        .eq("id", charter.linked_task_id)
        .eq("user_id", userId);
      // Suppress unused-import warning; keep symbol available for future direct call.
      void submitTaskWithWork;

      // Chapter tick
      try {
        const { tickChapterBySlug } = await import("@/lib/chapters.functions");
        await tickChapterBySlug(supabase, userId, "charter");
      } catch (e) {
        console.error("charter chapter tick failed", e);
      }
    }

    // Notify sponsor in the inbox (simulated sponsor pings back)
    try {
      await supabase.from("inbox_messages").insert({
        user_id: userId,
        sender_name: "David Okafor",
        sender_role: "Executive Sponsor",
        subject: `Received: Project Charter v${nextVersion}`,
        body:
          `Thanks — I've received v${nextVersion} of the Charter (${pct}% complete). I'll review the objectives, milestones and risks and come back with any change requests or approval.`,
        tone: "supportive",
        read: false,
      });
    } catch (e) {
      console.error("charter sponsor inbox insert failed", e);
    }

    return { ok: true, version: nextVersion, completion_pct: pct };
  });

/** Convenience: recompute completion on the fly (used by clients that want
 * the authoritative number without persisting a save). */
export const previewCharterCompletion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ payload: z.record(z.string(), z.string()) }).parse(d),
  )
  .handler(async ({ data }) => ({ completion_pct: computeCompletion(data.payload) }));