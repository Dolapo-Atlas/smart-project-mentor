import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const Kind = z.enum(["risk", "assumption", "issue", "dependency"]);
const Sev = z.enum(["low", "medium", "high", "critical"]);
const Status = z.enum(["open", "mitigating", "closed"]);
const Rag = z.enum(["green", "amber", "red"]);
const Area = z.enum([
  "scope", "schedule", "budget", "quality", "resources", "stakeholders", "risks",
]);

export const listRaid = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("raid_items")
      .select("*")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  });

export const createRaid = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      kind: Kind,
      title: z.string().min(1),
      description: z.string().optional(),
      severity: Sev.default("medium"),
      likelihood: Sev.default("medium"),
      owner: z.string().optional(),
      due_date: z.string().optional(),
      mitigation: z.string().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("raid_items")
      .insert({ user_id: context.userId, ...data })
      .select()
      .single();
    if (error) throw error;
    return row;
  });

export const updateRaidStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), status: Status }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("raid_items")
      .update({ status: data.status })
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw error;
    return { ok: true };
  });

export const deleteRaid = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("raid_items")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw error;
    return { ok: true };
  });

export const listRag = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("workstream_rag")
      .select("*")
      .eq("user_id", context.userId);
    if (error) throw error;
    return data ?? [];
  });

export const upsertRag = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ area: Area, rag: Rag, note: z.string().optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("workstream_rag")
      .upsert(
        { user_id: context.userId, ...data },
        { onConflict: "user_id,area" },
      )
      .select()
      .single();
    if (error) throw error;
    return row;
  });