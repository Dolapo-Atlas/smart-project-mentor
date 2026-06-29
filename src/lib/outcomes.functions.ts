import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

/* ---------------- Scoring ---------------- */

type Breakdown = {
  stakeholders: { score: number; weight: number; detail: string };
  tasks: { score: number; weight: number; detail: string };
  budget: { score: number; weight: number; detail: string };
  raid: { score: number; weight: number; detail: string };
  reports: { score: number; weight: number; detail: string };
};

function grade(score: number): "Distinction" | "Pass" | "Conditional" | "Did Not Pass" {
  if (score >= 85) return "Distinction";
  if (score >= 60) return "Pass";
  if (score >= 40) return "Conditional";
  return "Did Not Pass";
}

function clamp(n: number, lo = 0, hi = 100) {
  return Math.max(lo, Math.min(hi, Math.round(n)));
}

async function scoreRun(
  supabase: any,
  userId: string,
  instanceId: string,
): Promise<{ score: number; breakdown: Breakdown; highlights: string[] }> {
  const [tasksRes, stakeRes, budgetRes, raidRes, reportsRes] = await Promise.all([
    supabase
      .from("tasks")
      .select("status, due_at, completed_at")
      .eq("user_id", userId)
      .eq("project_instance_id", instanceId),
    supabase
      .from("stakeholder_relationships")
      .select("sentiment")
      .eq("user_id", userId)
      .eq("project_instance_id", instanceId),
    supabase
      .from("budget_lines")
      .select("kind, amount")
      .eq("user_id", userId)
      .eq("project_instance_id", instanceId),
    supabase
      .from("raid_items")
      .select("kind, status")
      .eq("user_id", userId)
      .eq("project_instance_id", instanceId),
    supabase
      .from("status_reports")
      .select("submitted_at, ai_score")
      .eq("user_id", userId)
      .eq("project_instance_id", instanceId),
  ]);

  const tasks = tasksRes.data ?? [];
  const stakeholders = stakeRes.data ?? [];
  const budget = budgetRes.data ?? [];
  const raid = raidRes.data ?? [];
  const reports = reportsRes.data ?? [];

  // Stakeholders (30%) — avg sentiment mapped from [-100,100] -> [0,100]
  const avgSent = stakeholders.length
    ? stakeholders.reduce((a: number, s: any) => a + (s.sentiment ?? 0), 0) / stakeholders.length
    : 0;
  const stake = clamp((avgSent + 100) / 2);
  const stakeDetail = `${stakeholders.length} stakeholder relationships · avg sentiment ${Math.round(avgSent)}`;

  // Tasks (25%) — done on time / done late / open
  const total = tasks.length || 1;
  const onTime = tasks.filter(
    (t: any) =>
      t.status === "done" &&
      t.completed_at &&
      (!t.due_at || new Date(t.completed_at) <= new Date(t.due_at)),
  ).length;
  const late = tasks.filter(
    (t: any) =>
      t.status === "done" &&
      t.completed_at &&
      t.due_at &&
      new Date(t.completed_at) > new Date(t.due_at),
  ).length;
  const tasksScore = clamp((onTime * 100 + late * 60) / total);
  const tasksDetail = `${onTime}/${tasks.length} on time, ${late} late`;

  // Budget (15%) — actual vs forecast variance
  let forecast = 0;
  let actual = 0;
  for (const b of budget) {
    if (b.kind === "forecast") forecast += Number(b.amount);
    if (b.kind === "actual") actual += Number(b.amount);
  }
  let budgetScore = 80;
  if (forecast > 0) {
    const variance = Math.abs(actual - forecast) / forecast;
    budgetScore = clamp(100 - variance * 200);
  }
  const budgetDetail = forecast
    ? `Actual £${Math.round(actual).toLocaleString()} vs forecast £${Math.round(forecast).toLocaleString()}`
    : "No budget lines logged";

  // RAID (15%) — risks logged & closed vs realised
  const risks = raid.filter((r: any) => r.kind === "risk").length;
  const issues = raid.filter((r: any) => r.kind === "issue").length;
  const closed = raid.filter((r: any) => r.status === "closed").length;
  const raidScore = clamp(40 + risks * 6 + closed * 4 - issues * 3);
  const raidDetail = `${risks} risks · ${issues} issues · ${closed} closed`;

  // Reports (15%) — number submitted plus avg AI score
  const submitted = reports.filter((r: any) => r.submitted_at).length;
  const avgAi = reports.length
    ? reports.reduce((a: number, r: any) => a + (r.ai_score ?? 70), 0) / reports.length
    : 0;
  const reportsScore = clamp(submitted * 18 + avgAi * 0.4);
  const reportsDetail = submitted
    ? `${submitted} report${submitted === 1 ? "" : "s"} · avg AI score ${Math.round(avgAi)}`
    : "No status reports submitted";

  const breakdown: Breakdown = {
    stakeholders: { score: stake, weight: 30, detail: stakeDetail },
    tasks: { score: tasksScore, weight: 25, detail: tasksDetail },
    budget: { score: budgetScore, weight: 15, detail: budgetDetail },
    raid: { score: raidScore, weight: 15, detail: raidDetail },
    reports: { score: reportsScore, weight: 15, detail: reportsDetail },
  };

  const score = clamp(
    Object.values(breakdown).reduce((a, b) => a + (b.score * b.weight) / 100, 0),
  );

  const highlights: string[] = [];
  if (stake >= 70) highlights.push("Kept stakeholder confidence high through closure.");
  else if (stake < 40) highlights.push("Stakeholder sentiment slipped — recovery work needed.");
  if (onTime / total > 0.75) highlights.push("Delivered the majority of tasks on time.");
  if (raid.length && closed / raid.length > 0.5) highlights.push("Strong RAID hygiene — issues didn't linger.");
  if (submitted >= 4) highlights.push("Reported consistently — sponsors were kept in the loop.");
  if (!highlights.length) highlights.push("First complete run — solid baseline to build on.");

  return { score, breakdown, highlights };
}

/* ---------------- Server fns ---------------- */

export const previewOutcome = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: profile } = await supabase
      .from("profiles")
      .select("current_project_instance_id")
      .eq("id", userId)
      .maybeSingle();
    const instanceId = profile?.current_project_instance_id;
    if (!instanceId) return null;
    return scoreRun(supabase, userId, instanceId);
  });

export const finalizeRun = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const { data: profile } = await supabase
      .from("profiles")
      .select("current_project_instance_id, display_name, first_name, preferred_name, role, career_goal")
      .eq("id", userId)
      .maybeSingle();

    const instanceId = profile?.current_project_instance_id;
    if (!instanceId) throw new Error("No active project to finalise");

    const { data: inst } = await supabase
      .from("project_instances")
      .select("id, display_name, project_templates(title)")
      .eq("id", instanceId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!inst) throw new Error("Project not found");

    const { score, breakdown, highlights } = await scoreRun(supabase, userId, instanceId);
    const g = grade(score);
    const userName =
      (profile as any)?.preferred_name ||
      (profile as any)?.display_name ||
      (profile as any)?.first_name ||
      "Atlas Coordinator";
    const userRole = (profile as any)?.role || (profile as any)?.career_goal || "Project Coordinator";
    const tplTitle =
      (inst as any).display_name ||
      (inst as any).project_templates?.title ||
      "Atlas Simulation";

    const { data, error } = await supabase
      .from("project_outcomes")
      .upsert(
        {
          user_id: userId,
          project_instance_id: instanceId,
          template_title: tplTitle,
          user_display_name: userName,
          user_role: userRole,
          score,
          grade: g,
          breakdown,
          highlights,
          completed_at: new Date().toISOString(),
        },
        { onConflict: "user_id,project_instance_id" },
      )
      .select("*")
      .single();
    if (error) throw error;

    // Mark the project instance closed so the user can start fresh later.
    await supabase
      .from("project_instances")
      .update({ status: "archived" })
      .eq("id", instanceId)
      .eq("user_id", userId);

    return data;
  });

export const getMyOutcome = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: profile } = await supabase
      .from("profiles")
      .select("current_project_instance_id")
      .eq("id", userId)
      .maybeSingle();
    const instanceId = profile?.current_project_instance_id;
    if (!instanceId) return null;
    const { data } = await supabase
      .from("project_outcomes")
      .select("*")
      .eq("user_id", userId)
      .eq("project_instance_id", instanceId)
      .maybeSingle();
    return data;
  });

export const getPublicCertificate = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ slug: z.string().min(6).max(64) }).parse(d))
  .handler(async ({ data }) => {
    const supabase = createClient<Database>(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
    );
    const { data: row, error } = await supabase
      .from("project_outcomes")
      .select("template_title, user_display_name, user_role, score, grade, completed_at, share_slug")
      .eq("share_slug", data.slug)
      .maybeSingle();
    if (error) throw error;
    return row;
  });