import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (error || !data) throw new Response("Forbidden", { status: 403 });
}

export const listEarlySignups = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error, count } = await supabaseAdmin
      .from("early_access_signups")
      .select(
        "id, name, email, desired_role, country, experience_level, referral_code, referred_by_code, created_at",
        { count: "exact" },
      )
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw error;
    return { total: count ?? 0, rows: data ?? [] };
  });

export const getAdminAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const activeSince = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const [
      totalRes,
      newTodayRes,
      activeRes,
      simsStartedRes,
      simsCompletedRes,
      feedbackRes,
      recent,
    ] = await Promise.all([
      supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }),
      supabaseAdmin
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .gte("sign_up_at", startOfToday.toISOString()),
      supabaseAdmin
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .gte("last_active_at", activeSince),
      supabaseAdmin.from("project_instances").select("id", { count: "exact", head: true }),
      supabaseAdmin
        .from("project_instances")
        .select("id", { count: "exact", head: true })
        .eq("status", "completed"),
      supabaseAdmin.from("ai_feedback").select("id", { count: "exact", head: true }),
      supabaseAdmin
        .from("profiles")
        .select("id, display_name, email, avatar_url, country, sign_up_at, last_login_at, last_active_at")
        .order("last_login_at", { ascending: false, nullsFirst: false })
        .limit(50),
    ]);

    const totalUsers = totalRes.count ?? 0;
    const simsStarted = simsStartedRes.count ?? 0;
    const simsCompleted = simsCompletedRes.count ?? 0;
    const completionRate = simsStarted > 0 ? Math.round((simsCompleted / simsStarted) * 100) : 0;

    return {
      totals: {
        users: totalUsers,
        newToday: newTodayRes.count ?? 0,
        active24h: activeRes.count ?? 0,
        simsStarted,
        simsCompleted,
        completionRate,
        feedback: feedbackRes.count ?? 0,
      },
      recent: recent.data ?? [],
    };
  });

const PHASE_ORDER = ["Initiation", "Planning", "Execution", "Monitoring", "Closure"];

/**
 * Per-learner funnel: where each user stopped, plus aggregate drop-off.
 */
export const getLearnerTracking = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [profilesRes, instancesRes, tasksRes, docsRes, chartersRes] = await Promise.all([
      supabaseAdmin
        .from("profiles")
        .select("id, display_name, email, role, country, sign_up_at, last_login_at, last_active_at, onboarded")
        .order("last_active_at", { ascending: false, nullsFirst: false })
        .limit(500),
      supabaseAdmin
        .from("project_instances")
        .select("id, user_id, current_phase, progress_pct, status, started_at, last_active_at, completed_at, intro_seen_at, tour_completed_at")
        .order("last_active_at", { ascending: false }),
      supabaseAdmin.from("tasks").select("user_id, status"),
      supabaseAdmin.from("documents").select("user_id"),
      supabaseAdmin.from("project_charters").select("user_id, approval_status, submitted_at"),
    ]);

    const profiles = profilesRes.data ?? [];
    const instances = instancesRes.data ?? [];
    const tasks = tasksRes.data ?? [];
    const docs = docsRes.data ?? [];
    const charters = chartersRes.data ?? [];

    const countBy = <T,>(rows: T[], key: (r: T) => string | null) => {
      const m = new Map<string, number>();
      for (const r of rows) {
        const k = key(r);
        if (!k) continue;
        m.set(k, (m.get(k) ?? 0) + 1);
      }
      return m;
    };

    const docCount = countBy(docs, (d: any) => d.user_id);
    const charterSubmitted = new Set(
      charters.filter((c: any) => c.submitted_at).map((c: any) => c.user_id as string),
    );

    const tasksDone = countBy(
      tasks.filter((t: any) => t.status === "done"),
      (t: any) => t.user_id,
    );
    const tasksTotal = countBy(tasks, (t: any) => t.user_id);

    const activeByUser = new Map<string, any>();
    const attemptsByUser = new Map<string, number>();
    for (const inst of instances as any[]) {
      attemptsByUser.set(inst.user_id, (attemptsByUser.get(inst.user_id) ?? 0) + 1);
      const existing = activeByUser.get(inst.user_id);
      if (!existing || (inst.status === "active" && existing.status !== "active")) {
        activeByUser.set(inst.user_id, inst);
      }
    }

    const rows = profiles.map((p: any) => {
      const inst = activeByUser.get(p.id);
      const done = tasksDone.get(p.id) ?? 0;
      const total = tasksTotal.get(p.id) ?? 0;

      let stage = "Signed up";
      if (inst?.completed_at) stage = "Completed simulation";
      else if (done > 0 || charterSubmitted.has(p.id)) stage = `Working in ${inst?.current_phase ?? "Initiation"}`;
      else if (inst?.tour_completed_at) stage = "Finished tour, no task done";
      else if (inst?.intro_seen_at) stage = "Saw brief, never started work";
      else if (inst) stage = "Started project, no activity";
      else if (p.onboarded) stage = "Onboarded, no project";

      return {
        id: p.id as string,
        name: (p.display_name as string) ?? null,
        email: (p.email as string) ?? null,
        role: (p.role as string) ?? null,
        country: (p.country as string) ?? null,
        signUpAt: p.sign_up_at as string | null,
        lastActiveAt: (inst?.last_active_at ?? p.last_active_at) as string | null,
        phase: (inst?.current_phase as string) ?? null,
        status: (inst?.status as string) ?? null,
        attempts: attemptsByUser.get(p.id) ?? 0,
        tasksDone: done,
        tasksTotal: total,
        documents: docCount.get(p.id) ?? 0,
        charterSubmitted: charterSubmitted.has(p.id),
        stage,
      };
    });

    const funnel = [
      { label: "Signed up", value: rows.length },
      { label: "Started a project", value: rows.filter((r) => r.attempts > 0).length },
      { label: "Saw project brief", value: rows.filter((r) => r.stage !== "Signed up" && r.stage !== "Onboarded, no project" && r.stage !== "Started project, no activity").length },
      { label: "Completed ≥1 task", value: rows.filter((r) => r.tasksDone > 0).length },
      { label: "Submitted charter", value: rows.filter((r) => r.charterSubmitted).length },
      { label: "Reached Planning+", value: rows.filter((r) => PHASE_ORDER.indexOf(r.phase ?? "Initiation") > 0).length },
      { label: "Completed simulation", value: rows.filter((r) => r.stage === "Completed simulation").length },
    ];

    const byPhase = PHASE_ORDER.map((phase) => ({
      phase,
      value: rows.filter((r) => r.phase === phase).length,
    }));

    const stalled = rows.filter(
      (r) =>
        r.attempts > 0 &&
        r.tasksDone === 0 &&
        r.lastActiveAt &&
        Date.now() - new Date(r.lastActiveAt).getTime() > 3 * 24 * 60 * 60 * 1000,
    ).length;

    return { rows, funnel, byPhase, stalled };
  });