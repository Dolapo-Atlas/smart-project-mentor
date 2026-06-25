import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const listProjectTemplates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("project_templates")
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) throw error;
    return data ?? [];
  });

export const listMyProjectInstances = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("project_instances")
      .select("*, project_templates(*)")
      .eq("user_id", context.userId)
      .order("last_active_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  });

export const getActiveProject = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: profile, error: pErr } = await context.supabase
      .from("profiles")
      .select("current_project_instance_id")
      .eq("id", context.userId)
      .maybeSingle();
    if (pErr) throw pErr;
    if (!profile?.current_project_instance_id) return null;
    const { data, error } = await context.supabase
      .from("project_instances")
      .select("*, project_templates(*)")
      .eq("id", profile.current_project_instance_id)
      .maybeSingle();
    if (error) throw error;
    return data;
  });

export const startProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ templateId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: template, error: tErr } = await supabase
      .from("project_templates")
      .select("id, title, is_playable")
      .eq("id", data.templateId)
      .maybeSingle();
    if (tErr) throw tErr;
    if (!template) throw new Error("Project template not found");
    if (!template.is_playable) throw new Error("This simulation isn't available yet.");

    // Reuse an existing active instance for the same template if present
    const { data: existing } = await supabase
      .from("project_instances")
      .select("id")
      .eq("user_id", userId)
      .eq("template_id", data.templateId)
      .in("status", ["active", "paused"])
      .order("last_active_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let instanceId = existing?.id;
    if (!instanceId) {
      const { data: created, error: cErr } = await supabase
        .from("project_instances")
        .insert({
          user_id: userId,
          template_id: template.id,
          display_name: template.title,
          status: "active",
        })
        .select("id")
        .single();
      if (cErr) throw cErr;
      instanceId = created.id;
    } else {
      await supabase
        .from("project_instances")
        .update({ status: "active", last_active_at: new Date().toISOString() })
        .eq("id", instanceId);
    }

    await supabase
      .from("profiles")
      .update({ current_project_instance_id: instanceId })
      .eq("id", userId);

    // Seed a simulation_state row for this instance if it doesn't have one yet.
    // Profile is now set to the new instance, so RLS will accept the insert; the
    // trigger fills project_instance_id automatically.
    const { data: existingState } = await supabase
      .from("simulation_state")
      .select("id")
      .eq("user_id", userId)
      .eq("project_instance_id", instanceId)
      .maybeSingle();
    if (!existingState) {
      await supabase.from("simulation_state").insert({ user_id: userId });
    }

    return { instanceId };
  });

export const setActiveProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ instanceId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // Verify ownership
    const { data: inst, error } = await supabase
      .from("project_instances")
      .select("id")
      .eq("id", data.instanceId)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    if (!inst) throw new Error("Project not found");

    await supabase
      .from("project_instances")
      .update({ last_active_at: new Date().toISOString(), status: "active" })
      .eq("id", data.instanceId);

    await supabase
      .from("profiles")
      .update({ current_project_instance_id: data.instanceId })
      .eq("id", userId);

    return { ok: true };
  });

export const archiveProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ instanceId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("project_instances")
      .update({ status: "archived" })
      .eq("id", data.instanceId)
      .eq("user_id", context.userId);
    if (error) throw error;
    return { ok: true };
  });