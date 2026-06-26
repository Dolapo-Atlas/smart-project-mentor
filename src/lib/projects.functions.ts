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
    // Profile is now set to the new instance, so RLS will accept the insert.
    // PK is (user_id, project_instance_id) — set both explicitly.
    const { data: existingState } = await supabase
      .from("simulation_state")
      .select("user_id")
      .eq("user_id", userId)
      .eq("project_instance_id", instanceId)
      .maybeSingle();
    if (!existingState) {
      const { error: ssErr } = await supabase
        .from("simulation_state")
        .insert({
          user_id: userId,
          project_instance_id: instanceId,
          project_name: template.title,
        });
      if (ssErr) console.error("simulation_state seed failed", ssErr);
    }

    return { instanceId, requiresIntro, templateId: template.id };
  });

export const markIntroSeen = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ instanceId: z.string().uuid(), templateId: z.string().uuid().optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: owned } = await supabase
      .from("project_instances")
      .select("id, template_id")
      .eq("id", data.instanceId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!owned) throw new Error("Project not found");
    if (data.templateId && owned.template_id !== data.templateId) {
      throw new Error("This intro does not match the active project.");
    }

    const { error: activeErr } = await supabase
      .from("profiles")
      .update({ current_project_instance_id: data.instanceId })
      .eq("id", userId);
    if (activeErr) throw activeErr;

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

    const { error: stateErr } = await supabase
      .from("simulation_state")
      .upsert(
        {
          user_id: userId,
          project_instance_id: data.instanceId,
          project_name: (inst as any)?.display_name || (inst as any)?.project_templates?.title || "Atlas Simulation",
        },
        { onConflict: "user_id,project_instance_id" },
      );
    if (stateErr) throw stateErr;

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

  ✓ Draft the Project Charter
  ✓ Meet your key stakeholders
  ✓ Review the current project status
  ✓ Submit an initial status update

Welcome to the team.

${pmName}
${pmRole}`;

      const { error: inboxErr } = await supabase.from("inbox_messages").insert({
        user_id: userId,
        project_instance_id: data.instanceId,
        sender_name: pmName,
        sender_role: pmRole,
        subject: `Welcome to ${projectTitle}`,
        tone: "supportive",
        body,
      });
      if (inboxErr) throw inboxErr;

      // Seed the four first-day objectives as real tasks so they appear in
      // Tasks, What's Next and the dashboard — not just buried in the email.
      const { count: existingTasks } = await supabase
        .from("tasks")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("project_instance_id", data.instanceId);

      if (!existingTasks || existingTasks === 0) {
        const objectives = [
          {
            title: "Draft the Project Charter",
            description: "There isn't a charter on file yet — that's your first deliverable. Capture scope, objectives, success criteria, assumptions, constraints and governance, then upload it in Documents.",
            priority: "high" as const,
            category: "Documentation",
            linked_area: "charter",
            linked_module_route: "/app/documents",
            completion_action: "Open Documents → New document → Project Charter, draft it and upload.",
          },
          {
            title: "Meet your key stakeholders",
            description: "Review the stakeholder roster — names, roles, sentiment and concerns.",
            priority: "medium" as const,
            category: "Stakeholder",
            linked_area: "stakeholders",
            linked_module_route: "/app/stakeholders",
            completion_action: "Open Stakeholders and read each profile card.",
          },
          {
            title: "Review the current project status",
            description: "Check Progress and RAID to understand where the programme stands today.",
            priority: "medium" as const,
            category: "Reporting",
            linked_area: "reports",
            linked_module_route: "/app/progress",
            completion_action: "Open Progress and the RAID log to scan the current state.",
          },
          {
            title: "Submit an initial status update",
            description: "Write your first weekly status report and submit it to Emma.",
            priority: "high" as const,
            category: "Reporting",
            linked_area: "reports",
            linked_module_route: "/app/reports",
            completion_action: "Open Reports → New status report and submit it.",
          },
        ];

        const { error: tasksErr } = await supabase.from("tasks").insert(
          objectives.map((o) => ({
            user_id: userId,
            project_instance_id: data.instanceId,
            title: o.title,
            description: o.description,
            priority: o.priority,
            category: o.category,
            linked_area: o.linked_area,
            linked_module_route: o.linked_module_route,
            completion_action: o.completion_action,
            status: "todo",
            source: "onboarding",
          })),
        );
        if (tasksErr) console.error("first-day tasks seed failed", tasksErr);
      }
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
      .select("id, template_id, intro_seen_at")
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

    return {
      ok: true,
      templateId: inst.template_id,
      requiresIntro: !inst.intro_seen_at,
    };
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