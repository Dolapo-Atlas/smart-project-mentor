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
    let requiresIntro = false;
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
      requiresIntro = true;
    } else {
      await supabase
        .from("project_instances")
        .update({ status: "active", last_active_at: new Date().toISOString() })
        .eq("id", instanceId);
      const { data: row } = await supabase
        .from("project_instances")
        .select("intro_seen_at")
        .eq("id", instanceId)
        .maybeSingle();
      requiresIntro = !row?.intro_seen_at;
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

    return { instanceId, requiresIntro, templateId: template.id };
  });

export const markIntroSeen = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ instanceId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("project_instances")
      .update({ intro_seen_at: new Date().toISOString() })
      .eq("id", data.instanceId)
      .eq("user_id", userId);
    if (error) throw error;

    // Seed the welcome email for this project instance (idempotent).
    const { data: inst } = await supabase
      .from("project_instances")
      .select("id, display_name, project_templates(title, pm_name, pm_role, sponsor_name, sponsor_role, key_skills)")
      .eq("id", data.instanceId)
      .maybeSingle();

    const { count: existing } = await supabase
      .from("inbox_messages")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("project_instance_id", data.instanceId);

    if ((!existing || existing === 0) && inst) {
      const tpl: any = (inst as any).project_templates ?? {};
      const projectTitle = (inst as any).display_name || tpl.title || "the programme";
      const pmName = tpl.pm_name || "Emma Collins";
      const pmRole = tpl.pm_role || "Programme Manager";

      const { data: profile } = await supabase
        .from("profiles")
        .select("first_name, preferred_name, display_name")
        .eq("id", userId)
        .maybeSingle();
      const firstName =
        profile?.preferred_name?.trim() ||
        profile?.first_name ||
        profile?.display_name?.split(" ")[0] ||
        "there";

      const body = `Hi ${firstName},

Welcome to ${projectTitle}. We're delighted you've joined us as our new Project Coordinator.

Over the coming weeks you'll help us coordinate stakeholders, maintain project documentation, support meetings, update reports and keep delivery moving.

You'll quickly realise that every decision has consequences. Some days will be calm. Others won't. Don't worry — you'll have guidance whenever you need it.

Your first objectives are waiting for you in the workspace:

  ✓ Read the Project Charter
  ✓ Meet your key stakeholders
  ✓ Review the current project status
  ✓ Submit an initial status update

Welcome to the team.

${pmName}
${pmRole}`;

      await supabase.from("inbox_messages").insert({
        user_id: userId,
        sender_name: pmName,
        sender_role: pmRole,
        subject: `Welcome to ${projectTitle}`,
        tone: "supportive",
        body,
      });
    }

    return { ok: true };
  });

export const markTourCompleted = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ instanceId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("project_instances")
      .update({ tour_completed_at: new Date().toISOString() })
      .eq("id", data.instanceId)
      .eq("user_id", context.userId);
    if (error) throw error;
    return { ok: true };
  });

export const getTemplateById = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ templateId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: tpl, error } = await context.supabase
      .from("project_templates")
      .select("*")
      .eq("id", data.templateId)
      .maybeSingle();
    if (error) throw error;
    return tpl;
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