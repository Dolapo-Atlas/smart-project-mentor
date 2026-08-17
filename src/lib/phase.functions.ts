import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  PHASE_LABELS,
  PHASE_READY_THRESHOLD,
  phaseOrFirst,
  type PhaseKey,
} from "@/lib/phases";

export type { PhaseKey };

export type PhaseItem = {
  key: string;
  label: string;
  pct: number;
  route: string;
  hint?: string;
  /** True once this item counts as delivered for phase progression. */
  done?: boolean;
};

export type PhaseProgress = {
  phase: PhaseKey;
  phaseLabel: string;
  overall: number;
  items: PhaseItem[];
  /** Checklist entries still blocking the phase gate. */
  outstanding: PhaseItem[];
  /** True when every checklist item is delivered and the gate can be defended. */
  gateReady: boolean;
};

function pct(n: number, target: number) {
  if (target <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((n / target) * 100)));
}

const DONE_STATUSES = new Set(["done", "approved", "completed", "closed"]);
const IGNORED_STATUSES = new Set(["dismissed", "archived", "cancelled", "canceled"]);

function scoreForStatus(status?: string | null) {
  if (DONE_STATUSES.has(status ?? "")) return 100;
  if (status === "submitted" || status === "review") return 80;
  if (status === "in_progress") return 50;
  if (status === "blocked") return 20;
  return 0;
}

function bestOf(...values: Array<number | null | undefined>) {
  return Math.max(0, ...values.map((v) => v ?? 0));
}

const LABELS = PHASE_LABELS;

type TaskRow = {
  title?: string | null;
  description?: string | null;
  status?: string | null;
  category?: string | null;
  linked_area?: string | null;
  linked_module_route?: string | null;
  source?: string | null;
};

type DocRow = { title?: string | null; status?: string | null; quality_score?: number | null };
type RaidRow = {
  kind?: string | null;
  status?: string | null;
  owner?: string | null;
  mitigation?: string | null;
  updated_at?: string | null;
};
type StakeholderRow = { stakeholder_name?: string | null; role?: string | null; interaction_count?: number | null };
type MeetingRow = {
  kind?: string | null;
  title?: string | null;
  agenda?: string | null;
  attendees?: unknown;
  held?: boolean | null;
  minutes?: string | null;
};
type StatusReportRow = { submitted_at?: string | null };
type BudgetRow = { kind?: string | null };
type ChangeRow = { title?: string | null; status?: string | null };
type ReflectionRow = { id?: string | null };
type GateRow = { phase?: string | null; status?: string | null };
type CommsRow = { id?: string | null };
type ArtifactRow = {
  completion_pct?: number | null;
  status?: string | null;
  approval_status?: string | null;
  submitted_at?: string | null;
};
type OutcomeRow = { id?: string | null };

export const getPhaseProgress = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<PhaseProgress> => {
    const { supabase, userId } = context;

    const { data: profile } = await supabase
      .from("profiles")
      .select("current_project_instance_id")
      .eq("id", userId)
      .maybeSingle();

    const instanceId = (profile as { current_project_instance_id?: string | null } | null)
      ?.current_project_instance_id;
    const scoped = (query: any) => (instanceId ? query.eq("project_instance_id", instanceId) : query);

    const [
      { data: state },
      { data: docs },
      { data: artifacts },
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
      { data: charterRow },
      { data: registerRow },
      { data: lessonsDocs },
      { data: outcomes },
    ] = await Promise.all([
      scoped(supabase.from("simulation_state").select("phase").eq("user_id", userId)).maybeSingle(),
      scoped(supabase.from("documents").select("title,status,quality_score").eq("user_id", userId)),
      scoped(supabase.from("project_artifacts").select("artifact_type,status,version,is_latest").eq("user_id", userId)),
      scoped(supabase.from("raid_items").select("kind,status,owner,mitigation,updated_at").eq("user_id", userId)),
      scoped(supabase.from("stakeholder_relationships").select("stakeholder_name,role,interaction_count").eq("user_id", userId)),
      scoped(supabase.from("meetings").select("kind,title,agenda,attendees,held,minutes").eq("user_id", userId)),
      scoped(supabase.from("tasks").select("title,description,status,category,linked_area,linked_module_route,source").eq("user_id", userId)),
      scoped(supabase.from("status_reports").select("submitted_at").eq("user_id", userId)),
      scoped(supabase.from("budget_lines").select("kind").eq("user_id", userId)),
      scoped(supabase.from("change_requests").select("title,status").eq("user_id", userId)),
      scoped(supabase.from("reflection_entries").select("id").eq("user_id", userId)),
      scoped(supabase.from("phase_gates").select("phase,status").eq("user_id", userId)),
      scoped(supabase.from("comms_messages").select("id").eq("user_id", userId)),
      scoped(supabase.from("project_charters").select("completion_pct,status,approval_status,submitted_at").eq("user_id", userId)).maybeSingle(),
      scoped(supabase.from("stakeholder_registers").select("completion_pct,approval_status,submitted_at").eq("user_id", userId)).maybeSingle(),
      scoped(supabase.from("lessons_learned_docs").select("completion_pct,status,approval_status,submitted_at").eq("user_id", userId)),
      scoped(supabase.from("project_outcomes").select("id").eq("user_id", userId)),
    ]);

    const phase = phaseOrFirst(state?.phase as string | undefined);
    const D = (docs ?? []) as DocRow[];
    const A = (artifacts ?? []) as { artifact_type?: string | null; status?: string | null }[];
    const R = (raid ?? []) as RaidRow[];
    const S = (stakeholders ?? []) as StakeholderRow[];
    const M = (meetings ?? []) as MeetingRow[];
    const T = ((tasks ?? []) as TaskRow[]).filter((t) => !IGNORED_STATUSES.has(t.status ?? ""));
    const SR = (reports ?? []) as StatusReportRow[];
    const B = (budget ?? []) as BudgetRow[];
    const CR = (changes ?? []) as ChangeRow[];
    const RE = (reflections ?? []) as ReflectionRow[];
    const G = (gates ?? []) as GateRow[];
    const C = (comms ?? []) as CommsRow[];
    const L = (lessonsDocs ?? []) as ArtifactRow[];
    const O = (outcomes ?? []) as OutcomeRow[];

    const docPct = (rx: RegExp) => {
      const match = D.filter((d) => rx.test(d.title ?? ""));
      if (match.length === 0) return 0;
      // Completion tracks whether the learner has actually delivered the
      // artifact — not how well it scored. A submitted/reviewed/approved
      // document is done; the quality score is feedback, not a blocker.
      const DELIVERED = new Set(["approved", "reviewed", "submitted", "review", "completed", "done"]);
      const delivered = match.some(
        (d) => DELIVERED.has(String(d.status ?? "").toLowerCase()) || (d.quality_score ?? 0) > 0,
      );
      if (delivered) return 100;
      return 50;
    };

    // project_artifacts is the canonical deliverable store — a submitted or
    // approved artifact of a given type counts as delivered.
    const artifactTypePct = (...types: string[]) => {
      const match = A.filter((a) => types.includes(String(a.artifact_type ?? "")));
      if (match.length === 0) return 0;
      const APPROVED = new Set(["approved"]);
      if (match.some((a) => APPROVED.has(String(a.status ?? "").toLowerCase()))) return 100;
      return 80;
    };

    const artifactPct = (row?: {
      completion_pct?: number | null;
      status?: string | null;
      approval_status?: string | null;
      submitted_at?: string | null;
    } | null) => {
      if (!row) return 0;
      if (row.approval_status === "approved") return 100;
      const base = row.completion_pct ?? 0;
      if (row.submitted_at || (row.status && row.status !== "draft")) return Math.max(base, 80);
      return base;
    };

    const lessonArtifactPct = () => {
      if (L.length === 0) return 0;
      return Math.max(0, ...L.map((row) => artifactPct(row)));
    };

    const taskMatches = (rx: RegExp, linkedAreas?: string | string[]) => {
      const areas = Array.isArray(linkedAreas)
        ? linkedAreas
        : linkedAreas
          ? [linkedAreas]
          : [];
      const match = T.filter((t) => {
        const text = `${t.title ?? ""} ${t.description ?? ""} ${t.category ?? ""} ${t.linked_area ?? ""}`;
        return rx.test(text) || (t.linked_area ? areas.includes(t.linked_area) : false);
      });
      return match;
    };

    const taskBestPct = (rx: RegExp, linkedAreas?: string | string[]) => {
      const match = taskMatches(rx, linkedAreas);
      if (match.length === 0) return 0;
      return Math.max(0, ...match.map((t) => scoreForStatus(t.status)));
    };

    const taskAveragePct = (rx: RegExp, linkedAreas?: string | string[]) => {
      const match = taskMatches(rx, linkedAreas);
      if (match.length === 0) return 0;
      return Math.round(match.reduce((sum, t) => sum + scoreForStatus(t.status), 0) / match.length);
    };

    const taskDoneHint = (rx: RegExp, linkedAreas?: string | string[]) => {
      const match = taskMatches(rx, linkedAreas);
      if (match.length === 0) return null;
      const done = match.filter((t) => DONE_STATUSES.has(t.status ?? "")).length;
      return `${done}/${match.length} linked tasks`;
    };

    const doneTaskCount = T.filter((t) => DONE_STATUSES.has(t.status ?? "")).length;
    const allTaskCompletion = T.length === 0 ? 0 : Math.round((doneTaskCount / T.length) * 100);

    let items: PhaseItem[] = [];

    if (phase === "initiation") {
      // Charter — prefer the live project_charters row (source of truth),
      // fall back to any legacy /charter/i document.
      let charter = docPct(/charter/i);
      if (charterRow) {
        const approved = charterRow.approval_status === "approved";
        const submitted = !!charterRow.status && charterRow.status !== "draft";
        const base = charterRow.completion_pct ?? 0;
        charter = Math.max(
          charter,
          approved ? 100 : submitted ? Math.max(base, 75) : base,
        );
      }
      charter = bestOf(charter, taskBestPct(/project charter|\bcharter\b|scope verification|technical spec|requirements|statement of work|\bsow\b/i, "charter"));
      // Stakeholder mapping — use the same sources the user actually works in:
      // the live Stakeholder Register artifact and the required stakeholder task.
      // Relationship rows are only a fallback because the UI can render roster
      // people without persisting a relationship row yet.
      const mapped = S.filter((s) => (s.role ?? "").trim().length > 0).length || S.length;
      const relationshipPct = pct(mapped, 5);
      const registerBase = registerRow?.completion_pct ?? 0;
      const registerPct = registerRow
        ? registerRow.submitted_at
          ? Math.max(registerBase, 80)
          : registerBase
        : 0;
      const stakeholderTaskPct = taskBestPct(/stakeholder (register|mapping|map)|meet your key stakeholders|stakeholder roster|stakeholder profile/i, "stakeholders");
      const stakeholderPct = Math.max(registerPct, stakeholderTaskPct, relationshipPct);
      // RAID setup — the artifact is the raid_items table itself.
      // Do NOT credit completion from task status alone; users must actually
      // log entries. Task completion can only nudge once at least one item exists.
      const kinds = new Set(R.map((r) => String(r.kind).toLowerCase()));
      const raidArtifactPct = pct(kinds.size, 4);
      const raidTaskNudge = kinds.size > 0
        ? taskBestPct(/raid log|risk register|risk log|assumption log|dependency log|issue log/i, "risk")
        : 0;
      const raidPct = bestOf(raidArtifactPct, raidTaskNudge);
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
      kickPct = bestOf(kickPct, taskBestPct(/kick.?off|vendor kickoff|steering committee|steerco|meeting agenda|meeting minutes/i, "meetings"));
      items = [
        { key: "charter", label: "Project Charter", pct: charter, route: "/app/charter" },
        {
          key: "stakeholders",
          label: "Stakeholder Register",
          pct: stakeholderPct,
          route: "/app/stakeholders",
          hint:
            stakeholderPct >= 100
              ? "All 5 required stakeholders mapped"
              : `${Math.min(mapped, 5)} of 5 required stakeholders mapped (roster shows everyone on the project)`,
        },
        { key: "raid", label: "RAID Log Setup", pct: raidPct, route: "/app/raid", hint: `${Math.min(kinds.size, 4)}/4 kinds (risks, assumptions, issues, dependencies)` },
        { key: "kickoff", label: "Kick-off Preparation", pct: kickPct, route: "/app/meetings" },
      ];
    } else if (phase === "planning") {
      const schedule = bestOf(
        artifactTypePct("project_schedule"),
        docPct(/schedule|plan\b|gantt|timeline|data migration/i),
        taskBestPct(/project schedule|schedule|timeline|gantt|data migration plan|migration plan|milestone/i),
      );
      const resource = bestOf(
        artifactTypePct("resource_plan", "raci_matrix"),
        docPct(/resource|team plan|raci/i),
        taskBestPct(/resource plan|resourcing|team plan|raci|resource plan revision|data remediation/i),
      );
      const budgetPct = bestOf(
        pct(B.length, 5),
        taskAveragePct(/budget|cost|forecast|baseline|cost.?to.?complete|financial|variance|contingency/i, "budget"),
      );
      const commsPlan = bestOf(
        artifactTypePct("communication_plan"),
        docPct(/communication|comms plan|stakeholder engagement/i),
        taskBestPct(/communication plan|comms plan|stakeholder engagement|communication cadence/i, "comms"),
      );
      const risksWithMitigation = R.filter((r) => String(r.kind).toLowerCase() === "risk" && (r.mitigation ?? "").trim().length > 0).length;
      const totalRisks = R.filter((r) => String(r.kind).toLowerCase() === "risk").length;
      const riskResponse = bestOf(
        artifactTypePct("risk_response_plan"),
        totalRisks === 0 ? 0 : pct(risksWithMitigation, totalRisks),
        taskBestPct(/risk response|risk register|risk mitigation|mitigation plan|raid/i, "risk"),
      );
      items = [
        { key: "schedule", label: "Project Schedule", pct: schedule, route: "/app/template/project_schedule" },
        ...(() => {
          // The WBS is only a deliverable once governance has asked for it
          // (a WBS task exists) or the learner has started one. It is never
          // mandatory by default.
          const wbsRx = /work breakdown|\bwbs\b/i;
          const wbsTasks = taskMatches(wbsRx);
          const wbsDoc = bestOf(artifactTypePct("wbs"), docPct(wbsRx));
          if (wbsTasks.length === 0 && wbsDoc === 0) return [];
          return [
            {
              key: "wbs",
              label: "Work Breakdown Structure",
              pct: bestOf(wbsDoc, taskBestPct(wbsRx)),
              route: "/app/template/wbs",
              hint: "Requested at governance review — what work is delivered, not when",
            },
          ];
        })(),
        { key: "resource", label: "Resource Plan", pct: resource, route: "/app/template/resource_plan" },
        { key: "budget", label: "Budget Baseline", pct: budgetPct, route: "/app/budget", hint: taskDoneHint(/budget|cost|forecast|baseline|cost.?to.?complete|financial|variance|contingency/i, "budget") ?? `${Math.min(B.length, 5)}/5 lines` },
        { key: "comms", label: "Communication Plan", pct: commsPlan, route: "/app/template/communication_plan" },
        { key: "risk", label: "Risk Response Plan", pct: riskResponse, route: "/app/template/risk_response_plan" },
      ];
    } else if (phase === "execution") {
      const executionTaskRx = /pilot|implementation|frontline|training|uat|go.?live|vendor|technical|data migration|team action|workstream/i;
      const executionMatches = taskMatches(executionTaskRx);
      const executionDone = executionMatches.filter((t) => DONE_STATUSES.has(t.status ?? "")).length;
      const tasksPct = executionMatches.length > 0 ? taskAveragePct(executionTaskRx) : allTaskCompletion;
      const teamActionRx = /team action|frontline|training|vendor|technical|workstream|implementation|pilot/i;
      const teamActionMatches = taskMatches(teamActionRx);
      const teamActionsDone = teamActionMatches.filter((t) => DONE_STATUSES.has(t.status ?? "")).length;
      const teamActions = teamActionMatches.length > 0
        ? bestOf(taskAveragePct(teamActionRx), pct(teamActionsDone, teamActionMatches.length))
        : 0;
      const deliverables = bestOf(
        pct(D.filter((d) => d.status === "approved").length, 3),
        pct(A.filter((a) => String(a.status ?? "") === "approved").length, 3),
        taskBestPct(/deliverable|pilot|implementation|migration|uat|technical spec|scope verification|requirements/i, ["documents", "charter"]),
      );
      const commsPct = bestOf(pct(C.length, 5), taskAveragePct(/stakeholder comms|stakeholder communication|brief|reply|update|communication/i, "comms"));
      items = [
        { key: "tasks", label: "Tasks Completed", pct: tasksPct, route: "/app/tasks", hint: executionMatches.length > 0 ? `${executionDone}/${executionMatches.length} execution tasks` : `${doneTaskCount}/${T.length}` },
        // Team Actions only counts once delegated/team workstream tasks exist —
        // otherwise it is an unclearable blocker with nothing for the learner to do.
        ...(teamActionMatches.length > 0
          ? [{
              key: "team",
              label: "Team Actions",
              pct: teamActions,
              route: "/app/tasks",
              hint: `${teamActionsDone}/${teamActionMatches.length} team workstream tasks closed`,
            }]
          : []),
        { key: "deliv", label: "Deliverables", pct: deliverables, route: "/app/documents" },
        {
          key: "uat",
          label: "UAT Test Plan",
          pct: bestOf(
            artifactTypePct("uat_plan"),
            docPct(/uat|user acceptance|test plan|test script/i),
            taskBestPct(/uat|user acceptance|test plan|test script/i, ["documents", "tasks"]),
          ),
          route: "/app/template/uat_plan",
        },
        {
          key: "training",
          label: "Training & Rollout",
          pct: bestOf(
            artifactTypePct("training_plan"),
            docPct(/training|rollout|super.?user/i),
            taskBestPct(/training|rollout|super.?user/i, ["documents", "tasks"]),
          ),
          route: "/app/template/training_plan",
        },
        {
          key: "cutover",
          label: "Cutover Plan",
          pct: bestOf(
            artifactTypePct("cutover_plan"),
            docPct(/cutover|runbook|go.?live plan|deployment plan/i),
            taskBestPct(/cutover|runbook|go.?live plan|deployment plan/i, ["documents", "tasks"]),
          ),
          route: "/app/template/cutover_plan",
        },
        { key: "comms", label: "Stakeholder Comms", pct: commsPct, route: "/app/comms" },
      ];
    } else if (phase === "monitoring") {
      const submitted = SR.filter((r) => !!r.submitted_at).length;
      const recentRaid = R.filter((r) => {
        const d = r.updated_at ? new Date(r.updated_at) : null;
        return d && Date.now() - d.getTime() < 1000 * 60 * 60 * 24 * 14;
      }).length;
      const raidUpdates = pct(recentRaid, Math.max(3, R.length));
      // Budget tracking in Monitoring means the learner is recording real
      // movement against the baseline: actuals/invoices logged, plus a
      // forecast. "budget" is not a valid budget_kind (planned | actual |
      // invoice | forecast), so the old denominator never matched anything.
      const tracked = B.filter((b) => ["actual", "invoice"].includes(String(b.kind).toLowerCase())).length;
      const hasForecast = B.some((b) => String(b.kind).toLowerCase() === "forecast");
      const budgetTrack = bestOf(
        Math.round(pct(Math.min(tracked, 3), 3) * 0.7 + (hasForecast ? 30 : 0)),
        taskAveragePct(/budget tracking|budget|actual|forecast|variance|cost.?to.?complete/i, "budget"),
      );
      const crPct = bestOf(pct(CR.length, 2), taskAveragePct(/change request|\bpcr\b|scope change|impact assessment|change board/i, "changes"));
      const schedule = bestOf(allTaskCompletion, taskAveragePct(/schedule performance|schedule|timeline|progress|milestone|delay|slippage/i, "reports"));
      const reportPct = bestOf(pct(submitted, 3), taskAveragePct(/status report|weekly status|board report|status update/i, "reports"));
      const raidUpdatePct = bestOf(raidUpdates, taskAveragePct(/raid update|risk update|risk|issue|dependency|assumption|mitigation/i, "risk"));
      items = [
        { key: "reports", label: "Status Reports", pct: reportPct, route: "/app/reports", hint: taskDoneHint(/status report|weekly status|board report|status update/i, "reports") ?? `${submitted}/3` },
        { key: "raid", label: "RAID Updates", pct: raidUpdatePct, route: "/app/raid" },
        { key: "budget", label: "Budget Tracking", pct: budgetTrack, route: "/app/budget" },
        { key: "changes", label: "Change Requests", pct: crPct, route: "/app/changes" },
        { key: "sched", label: "Schedule Performance", pct: schedule, route: "/app/progress" },
        { key: "benefits", label: "Benefits Tracker", pct: taskBestPct(/benefits (tracker|realisation|realization|register)|benefit tracking/i, ["documents"]), route: "/app/template/benefits_tracker" },
      ];
    } else if (phase === "go-live") {
      const goLiveReadiness = taskAveragePct(/go.?live|cutover|readiness|pilot|uat|launch|deployment/i);
      const cutoverSupport = taskAveragePct(/cutover|hypercare|support|deployment|launch|standby/i);
      const stakeholderReadiness = bestOf(
        taskAveragePct(/stakeholder readiness|frontline|training|briefing|comms|communication/i, ["stakeholders", "comms"]),
        pct(C.length, 5),
      );
      // The Go-Live gate defence IS the go-live decision, so an OPEN gate
      // counts as delivered. Requiring "passed" here would make the gate its
      // own precondition and deadlock the phase.
      const goLiveGate = G.find((g) => String(g.phase).toLowerCase() === "go-live");
      const decisionPct = bestOf(
        goLiveGate && goLiveGate.status !== "locked" ? 100 : 0,
        taskBestPct(/go.?live decision|sponsor approval|sign.?off|approval|phase gate|steering committee/i, "gates"),
      );
      items = [
        { key: "readiness", label: "Go-Live Readiness", pct: goLiveReadiness, route: "/app/tasks", hint: taskDoneHint(/go.?live|cutover|readiness|pilot|uat|launch|deployment/i) ?? undefined },
        { key: "cutover", label: "Cutover & Support", pct: cutoverSupport, route: "/app/tasks", hint: taskDoneHint(/cutover|hypercare|support|deployment|launch|standby/i) ?? undefined },
        { key: "stakeholders", label: "Stakeholder Readiness", pct: stakeholderReadiness, route: "/app/stakeholders" },
        { key: "approval", label: "Go-Live Decision", pct: decisionPct, route: "/app/gates" },
      ];
    } else {
      // closure
      // Closure items must key off closure-specific evidence only. Falling back
      // to linked_area ("documents", "reports") matched any approved task from
      // earlier phases and made the whole phase read 100% on entry.
      const deliverableTypes = [
        "project_charter",
        "stakeholder_register",
        "project_schedule",
        "wbs",
        "resource_plan",
        "communication_plan",
        "risk_response_plan",
        "uat_plan",
        "training_plan",
        "cutover_plan",
      ];
      const approvedTypes = new Set(
        A.filter((a) => String(a.status ?? "").toLowerCase() === "approved").map((a) => String(a.artifact_type ?? "")),
      );
      const deliveredCount = deliverableTypes.filter((t) => approvedTypes.has(t)).length;
      const finalDeliv = bestOf(
        pct(deliveredCount, deliverableTypes.length),
        pct(D.filter((d) => ["approved", "reviewed"].includes(String(d.status ?? "").toLowerCase())).length, Math.max(3, D.length)),
      );
      const handover = bestOf(
        artifactTypePct("handover_note"),
        docPct(/handover|hand.?over|transition note|transition plan/i),
        taskBestPct(/handover|hand.?over|transition note|support model/i),
      );
      const lessons = bestOf(
        artifactTypePct("lessons_learned"),
        lessonArtifactPct(),
        taskBestPct(/lessons learned|retrospective|post.?mortem/i),
      );
      const closureReport = bestOf(
        artifactTypePct("closure_report"),
        docPct(/closure report|close.?out report|final report/i),
        taskBestPct(/closure report|close.?out report|final report|project closure/i),
      );
      const closureGate = G.find((g) => String(g.phase).toLowerCase() === "closure");
      const sponsorApproval = bestOf(
        // Same self-reference rule as Go-Live: the sponsor sign-off happens at
        // the Closure gate itself, so an open gate satisfies this item.
        closureGate && closureGate.status !== "locked" ? 100 : 0,
        O.length > 0 ? 100 : 0,
        taskBestPct(/sponsor approval|closure approval|closure sign.?off|closure gate/i),
      );
      items = [
        { key: "final", label: "Final Deliverables", pct: finalDeliv, route: "/app/documents" },
        { key: "handover", label: "Handover", pct: handover, route: "/app/template/handover_note" },
        { key: "lessons", label: "Lessons Learned", pct: lessons, route: "/app/lessons" },
        { key: "report", label: "Closure Report", pct: closureReport, route: "/app/template/closure_report" },
        { key: "sponsor", label: "Sponsor Approval", pct: sponsorApproval, route: "/app/gates" },
      ];
    }

    items = items.map((it) => ({ ...it, done: it.pct >= PHASE_READY_THRESHOLD }));

    const overall =
      items.length === 0 ? 0 : Math.round(items.reduce((s, it) => s + it.pct, 0) / items.length);
    const outstanding = items.filter((it) => !it.done);

    return {
      phase,
      phaseLabel: LABELS[phase],
      overall,
      items,
      outstanding,
      gateReady: outstanding.length === 0,
    };
  });