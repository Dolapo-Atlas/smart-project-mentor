import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type PhaseKey = "initiation" | "planning" | "execution" | "monitoring" | "closure";

export type PhaseItem = {
  key: string;
  label: string;
  pct: number;
  route: string;
  hint?: string;
};

export type PhaseProgress = {
  phase: PhaseKey;
  phaseLabel: string;
  overall: number;
  items: PhaseItem[];
};

function pct(n: number, target: number) {
  if (target <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((n / target) * 100)));
}

function normalisePhase(p?: string | null): PhaseKey {
  const k = (p ?? "").toLowerCase().trim();
  if (k.startsWith("init")) return "initiation";
  if (k.startsWith("plan")) return "planning";
  if (k.startsWith("exec")) return "execution";
  if (k.startsWith("mon")) return "monitoring";
  if (k.startsWith("clos")) return "closure";
  return "execution";
}

const LABELS: Record<PhaseKey, string> = {
  initiation: "Initiation",
  planning: "Planning",
  execution: "Execution",
  monitoring: "Monitoring & Control",
  closure: "Closure",
};

export const getPhaseProgress = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<PhaseProgress> => {
    const { supabase, userId } = context;

    const [
      { data: state },
      { data: docs },
      { data: raid },
      { data: stakeholders },
      { data: meetings },
      { data: tasks },
      { data: reports },
      { data: budget },
      { data: changes },
      { data: reflections },
      { data: gates },
      { data: comms },
    ] = await Promise.all([
      supabase.from("simulation_state").select("phase").eq("user_id", userId).maybeSingle(),
      supabase.from("documents").select("title,status,quality_score").eq("user_id", userId),
      supabase.from("raid_items").select("kind,status,owner,mitigation,updated_at").eq("user_id", userId),
      supabase.from("stakeholder_relationships").select("stakeholder_name,role,interaction_count").eq("user_id", userId),
      supabase.from("meetings").select("kind,title,agenda,attendees,held,minutes").eq("user_id", userId),
      supabase.from("tasks").select("status,category").eq("user_id", userId),
      supabase.from("status_reports").select("submitted_at").eq("user_id", userId),
      supabase.from("budget_lines").select("kind").eq("user_id", userId),
      supabase.from("change_requests").select("status").eq("user_id", userId),
      supabase.from("reflection_entries").select("id").eq("user_id", userId),
      supabase.from("phase_gates").select("phase,status").eq("user_id", userId),
      supabase.from("comms_messages").select("id").eq("user_id", userId),
    ]);

    const phase = normalisePhase(state?.phase as string | undefined);
    const D = docs ?? [];
    const R = raid ?? [];
    const S = stakeholders ?? [];
    const M = meetings ?? [];
    const T = tasks ?? [];
    const SR = reports ?? [];
    const B = budget ?? [];
    const CR = changes ?? [];
    const RE = reflections ?? [];
    const G = gates ?? [];
    const C = comms ?? [];

    const has = (rx: RegExp, list: { title?: string | null }[]) =>
      list.some((d) => rx.test(d.title ?? ""));
    const docPct = (rx: RegExp) => {
      const match = D.filter((d) => rx.test(d.title ?? ""));
      if (match.length === 0) return 0;
      const approved = match.some((d) => d.status === "approved");
      if (approved) return 100;
      const best = Math.max(0, ...match.map((d) => d.quality_score ?? 0));
      if (best > 0) return Math.max(50, Math.min(95, best));
      return 50;
    };

    let items: PhaseItem[] = [];

    if (phase === "initiation") {
      // Charter
      const charter = docPct(/charter/i);
      // Stakeholder mapping — target 5 stakeholders with a role captured
      const mapped = S.filter((s) => (s.role ?? "").trim().length > 0).length || S.length;
      const stakeholderPct = pct(mapped, 5);
      // RAID setup — need at least one of each kind (R,A,I,D)
      const kinds = new Set(R.map((r) => String(r.kind).toLowerCase()));
      const raidPct = pct(kinds.size, 4);
      // Kick-off preparation — steering meeting with agenda/attendees/held
      const kickoff = M.find((m) =>
        /kick.?off|kickoff/i.test(m.title ?? "") || m.kind === "steering",
      );
      let kickPct = 0;
      if (kickoff) {
        kickPct = 25;
        if (kickoff.agenda && kickoff.agenda.trim().length > 10) kickPct += 25;
        const attCount = Array.isArray(kickoff.attendees) ? kickoff.attendees.length : 0;
        if (attCount >= 3) kickPct += 25;
        if (kickoff.held) kickPct += 25;
      }
      items = [
        { key: "charter", label: "Project Charter", pct: charter, route: "/app/documents" },
        { key: "stakeholders", label: "Stakeholder Mapping", pct: stakeholderPct, route: "/app/stakeholders", hint: `${Math.min(mapped, 5)}/5 mapped` },
        { key: "raid", label: "RAID Log Setup", pct: raidPct, route: "/app/raid", hint: `${Math.min(kinds.size, 4)}/4 kinds (risks, assumptions, issues, dependencies)` },
        { key: "kickoff", label: "Kick-off Preparation", pct: kickPct, route: "/app/meetings" },
      ];
    } else if (phase === "planning") {
      const schedule = docPct(/schedule|plan\b|gantt|timeline/i);
      const resource = docPct(/resource|team plan|raci/i);
      const budgetPct = pct(B.length, 5);
      const commsPlan = docPct(/communication|comms plan|stakeholder engagement/i);
      const risksWithMitigation = R.filter((r) => String(r.kind).toLowerCase() === "risk" && (r.mitigation ?? "").trim().length > 0).length;
      const totalRisks = R.filter((r) => String(r.kind).toLowerCase() === "risk").length;
      const riskResponse = totalRisks === 0 ? 0 : pct(risksWithMitigation, totalRisks);
      items = [
        { key: "schedule", label: "Project Schedule", pct: schedule, route: "/app/documents" },
        { key: "resource", label: "Resource Plan", pct: resource, route: "/app/documents" },
        { key: "budget", label: "Budget Baseline", pct: budgetPct, route: "/app/budget", hint: `${B.length}/5 lines` },
        { key: "comms", label: "Communication Plan", pct: commsPlan, route: "/app/documents" },
        { key: "risk", label: "Risk Response Plan", pct: riskResponse, route: "/app/raid" },
      ];
    } else if (phase === "execution") {
      const done = T.filter((t) => ["done", "approved", "completed", "closed"].includes(t.status)).length;
      const tasksPct = T.length === 0 ? 0 : Math.round((done / T.length) * 100);
      const inProg = T.filter((t) => t.status === "in_progress" || t.status === "review").length;
      const teamActions = pct(inProg + done, Math.max(6, T.length));
      const deliverables = pct(D.filter((d) => d.status === "approved").length, 3);
      const commsPct = pct(C.length, 5);
      items = [
        { key: "tasks", label: "Tasks Completed", pct: tasksPct, route: "/app/tasks", hint: `${done}/${T.length}` },
        { key: "team", label: "Team Actions", pct: teamActions, route: "/app/tasks" },
        { key: "deliv", label: "Deliverables", pct: deliverables, route: "/app/documents" },
        { key: "comms", label: "Stakeholder Comms", pct: commsPct, route: "/app/comms" },
      ];
    } else if (phase === "monitoring") {
      const submitted = SR.filter((r) => !!r.submitted_at).length;
      const recentRaid = R.filter((r) => {
        const d = r.updated_at ? new Date(r.updated_at) : null;
        return d && Date.now() - d.getTime() < 1000 * 60 * 60 * 24 * 14;
      }).length;
      const raidUpdates = pct(recentRaid, Math.max(3, R.length));
      const actuals = B.filter((b) => String(b.kind).toLowerCase() === "actual").length;
      const budgets = B.filter((b) => String(b.kind).toLowerCase() === "budget").length || 1;
      const budgetTrack = pct(actuals, budgets);
      const crPct = pct(CR.length, 2);
      const doneTasks = T.filter((t) => ["done", "approved", "completed", "closed"].includes(t.status)).length;
      const schedule = T.length === 0 ? 0 : Math.round((doneTasks / T.length) * 100);
      items = [
        { key: "reports", label: "Status Reports", pct: pct(submitted, 3), route: "/app/reports", hint: `${submitted}/3` },
        { key: "raid", label: "RAID Updates", pct: raidUpdates, route: "/app/raid" },
        { key: "budget", label: "Budget Tracking", pct: budgetTrack, route: "/app/budget" },
        { key: "changes", label: "Change Requests", pct: crPct, route: "/app/changes" },
        { key: "sched", label: "Schedule Performance", pct: schedule, route: "/app/progress" },
      ];
    } else {
      // closure
      const finalDeliv = pct(D.filter((d) => d.status === "approved").length, Math.max(3, D.length));
      const handover = docPct(/handover|hand.?over|transition/i);
      const lessons = pct(RE.length, 3);
      const closureReport = docPct(/closure|close.?out|final report/i);
      const closureGate = G.find((g) => String(g.phase).toLowerCase() === "closure");
      const sponsorApproval = closureGate?.status === "passed" ? 100 : closureGate?.status === "open" ? 50 : 0;
      items = [
        { key: "final", label: "Final Deliverables", pct: finalDeliv, route: "/app/documents" },
        { key: "handover", label: "Handover", pct: handover, route: "/app/documents" },
        { key: "lessons", label: "Lessons Learned", pct: lessons, route: "/app/reviews" },
        { key: "report", label: "Closure Report", pct: closureReport, route: "/app/documents" },
        { key: "sponsor", label: "Sponsor Approval", pct: sponsorApproval, route: "/app/gates" },
      ];
    }

    const overall =
      items.length === 0 ? 0 : Math.round(items.reduce((s, it) => s + it.pct, 0) / items.length);

    return { phase, phaseLabel: LABELS[phase], overall, items };
  });