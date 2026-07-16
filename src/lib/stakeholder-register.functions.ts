import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { TEMPLATES, evaluateGenericTemplate, encodeSubmission } from "./templates";

export type RegisterRow = {
  id: string;
  payload: Record<string, string>;
  completion_pct: number;
  approval_status: string;
  sponsor_comment: string | null;
  version: number;
  linked_task_id: string | null;
  submitted_at: string | null;
  updated_at: string;
};

function computeCompletion(payload: Record<string, string>): number {
  const spec = TEMPLATES.stakeholder_register.fields;
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

export const getOrCreateRegister = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ task_id: z.string().uuid().optional() }).parse(d ?? {}),
  )
  .handler(async ({ data, context }): Promise<RegisterRow> => {
    const { supabase, userId } = context;
    const { data: existing } = await supabase
      .from("stakeholder_registers")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (existing) {
      if (data.task_id && existing.linked_task_id !== data.task_id) {
        const { data: updated } = await supabase
          .from("stakeholder_registers")
          .update({ linked_task_id: data.task_id })
          .eq("id", existing.id)
          .select("*")
          .single();
        return updated as unknown as RegisterRow;
      }
      return existing as unknown as RegisterRow;
    }
    const { data: created, error } = await supabase
      .from("stakeholder_registers")
      .insert({
        user_id: userId,
        linked_task_id: data.task_id ?? null,
        payload: {},
        completion_pct: 0,
      })
      .select("*")
      .single();
    if (error) throw error;
    return created as unknown as RegisterRow;
  });

export const saveRegisterDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string().uuid(),
      payload: z.record(z.string(), z.string()),
    }).parse(d),
  )
  .handler(async ({ data, context }): Promise<RegisterRow> => {
    const pct = computeCompletion(data.payload);
    const { data: updated, error } = await context.supabase
      .from("stakeholder_registers")
      .update({
        payload: data.payload,
        completion_pct: pct,
        approval_status: "draft",
      })
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .select("*")
      .single();
    if (error) throw error;
    return updated as unknown as RegisterRow;
  });

export const listRegisterVersions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: reg } = await context.supabase
      .from("stakeholder_registers")
      .select("id")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!reg) return [];
    const { data } = await context.supabase
      .from("stakeholder_register_versions")
      .select("id,version,submitted_at,completion_pct")
      .eq("register_id", reg.id)
      .order("version", { ascending: false });
    return data ?? [];
  });

export const submitRegister = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: reg } = await supabase
      .from("stakeholder_registers")
      .select("*")
      .eq("id", data.id)
      .eq("user_id", userId)
      .maybeSingle();
    if (!reg) throw new Error("Register not found");
    const payload = (reg.payload ?? {}) as Record<string, string>;
    const pct = computeCompletion(payload);
    if (pct < 40) throw new Error("Register isn't ready — complete more required sections first.");

    const nextVersion = (reg.version ?? 1) + (reg.submitted_at ? 1 : 0);

    await supabase.from("stakeholder_register_versions").insert({
      register_id: reg.id,
      user_id: userId,
      version: nextVersion,
      payload,
      completion_pct: pct,
    });

    await supabase
      .from("stakeholder_registers")
      .update({
        approval_status: "submitted",
        submitted_at: new Date().toISOString(),
        version: nextVersion,
        completion_pct: pct,
      })
      .eq("id", reg.id);

    if (reg.linked_task_id) {
      const readiness = evaluateGenericTemplate("stakeholder_register", payload);
      const encoded = encodeSubmission({
        kind: "template",
        template: "stakeholder_register",
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
        .eq("id", reg.linked_task_id)
        .eq("user_id", userId);
    }

    try {
      await supabase.from("inbox_messages").insert({
        user_id: userId,
        sender_name: "David Okafor",
        sender_role: "Executive Sponsor",
        subject: `Received: Stakeholder Register v${nextVersion}`,
        body: `Thanks — I've got v${nextVersion} of the Stakeholder Register (${pct}% complete). I'll flag anyone I think is missing.`,
        tone: "supportive",
        read: false,
      });
    } catch (e) {
      console.error("register sponsor inbox insert failed", e);
    }

    return { ok: true, version: nextVersion, completion_pct: pct };
  });
