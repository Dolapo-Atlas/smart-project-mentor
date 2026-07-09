import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (error || !data) throw new Response("Forbidden", { status: 403 });
}

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