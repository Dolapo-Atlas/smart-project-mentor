import {
  encodeSubmission,
  evaluateCharter,
  evaluateGenericTemplate,
  evaluateStatusReport,
  type TemplateKind,
} from "./templates";

const ACTIVE_TASK_STATUSES = ["todo", "in_progress", "blocked"];
const OPEN_OR_SUBMITTED_STATUSES = ["todo", "in_progress", "blocked", "submitted"];

type TaskRow = {
  id: string;
  title: string | null;
  description: string | null;
  status: string | null;
  category: string | null;
  linked_area: string | null;
  linked_module_route: string | null;
};

function textOf(task: TaskRow) {
  return `${task.title ?? ""} ${task.description ?? ""} ${task.category ?? ""} ${task.linked_area ?? ""} ${task.linked_module_route ?? ""}`.toLowerCase();
}

function routeOf(task: TaskRow) {
  return (task.linked_module_route ?? "").toLowerCase();
}

function matchesArtifact(task: TaskRow, template: TemplateKind) {
  const text = textOf(task);
  const route = routeOf(task);
  switch (template) {
    case "status_report":
      return (
        task.linked_area === "reports" ||
        route === "/app/reports" ||
        route === "/app/progress" ||
        /\b(status report|status update|weekly status|project status|current project status|reporting)\b/.test(text)
      );
    case "project_charter":
      return task.linked_area === "charter" || route === "/app/charter" || /\b(project charter|charter)\b/.test(text);
    case "stakeholder_register":
      return (
        task.linked_area === "stakeholders" ||
        route === "/app/stakeholders" ||
        /\bstakeholder/.test(text)
      );
    case "raid_log":
      return task.linked_area === "risk" || route === "/app/raid" || /\b(raid|risk log|risk register)\b/.test(text);
    case "change_request":
      return task.linked_area === "changes" || route === "/app/changes" || /\b(change request|change control|scope change|\bcr\b)/.test(text);
    case "lessons_learned":
      return route === "/app/lessons" || /\b(lessons learned|retrospective|retro|closure)\b/.test(text);
    case "resource_plan":
      return /\b(resource plan|resourcing|capacity plan|staffing plan)\b/.test(text);
    case "meeting_agenda":
      return task.linked_area === "meetings" || route === "/app/meetings" || /\b(meeting agenda|agenda|minutes|steerco)\b/.test(text);
    default:
      return false;
  }
}

export async function markSubmittedArtifactTasks(
  supabase: any,
  userId: string,
  args: { template: TemplateKind; submission?: string; linkedTaskId?: string | null },
) {
  return markSubmittedArtifactTasksImpl(supabase, userId, args);
}

/** artifact_type in project_artifacts -> the template matcher used for tasks. */
const ARTIFACT_TEMPLATE_MATCH: Record<string, (task: TaskRow) => boolean> = {
  project_charter: (t) => matchesArtifact(t, "project_charter"),
  stakeholder_register: (t) => matchesArtifact(t, "stakeholder_register"),
  status_report: (t) => matchesArtifact(t, "status_report"),
  raid_log: (t) => matchesArtifact(t, "raid_log"),
  change_request: (t) => matchesArtifact(t, "change_request"),
  lessons_learned: (t) => matchesArtifact(t, "lessons_learned"),
  resource_plan: (t) => matchesArtifact(t, "resource_plan"),
  project_schedule: (t) => routeOf(t).includes("/template/schedule") || /\b(project schedule|schedule|gantt)\b/.test(textOf(t)),
  wbs: (t) => routeOf(t).includes("/template/wbs") || /\b(work breakdown|wbs)\b/.test(textOf(t)),
  communication_plan: (t) => routeOf(t).includes("/template/communication") || /\bcommunication(s)? plan\b/.test(textOf(t)),
  uat_plan: (t) => routeOf(t).includes("/template/uat") || /\b(uat|user acceptance|test plan)\b/.test(textOf(t)),
  training_plan: (t) => routeOf(t).includes("/template/training") || /\btraining\b/.test(textOf(t)),
  cutover_plan: (t) => routeOf(t).includes("/template/cutover") || /\b(cutover|go-live plan|go live plan)\b/.test(textOf(t)),
  benefits_realisation: (t) => routeOf(t).includes("/template/benefits") || /\bbenefit/.test(textOf(t)),
  closure_report: (t) => routeOf(t).includes("/template/closure") || /\bclosure report\b/.test(textOf(t)),
};

/**
 * Closes tasks whose deliverable has already been approved. Without this,
 * initiation/planning tasks stay on the board after the learner has moved on.
 */
export async function reconcileApprovedArtifactTasks(supabase: any, userId: string) {
  try {
    const { data: artifacts } = await supabase
      .from("project_artifacts")
      .select("artifact_type,status,approved_at")
      .eq("user_id", userId)
      .eq("status", "approved");
    const approved = new Set<string>((artifacts ?? []).map((a: any) => a.artifact_type));
    if (approved.size === 0) return;

    const { data: tasks } = await supabase
      .from("tasks")
      .select("id,title,description,status,category,linked_area,linked_module_route")
      .eq("user_id", userId)
      .in("status", OPEN_OR_SUBMITTED_STATUSES);
    const rows = (tasks ?? []) as TaskRow[];
    if (rows.length === 0) return;

    const ids = rows
      .filter((task) =>
        Array.from(approved).some((type) => ARTIFACT_TEMPLATE_MATCH[type]?.(task) ?? false),
      )
      .map((task) => task.id);
    if (ids.length === 0) return;

    await supabase
      .from("tasks")
      .update({ status: "approved", completed_at: new Date().toISOString() })
      .eq("user_id", userId)
      .in("id", ids);
  } catch (error) {
    console.error("approved-artifact task reconciliation failed", error);
  }
}

async function markSubmittedArtifactTasksImpl(
  supabase: any,
  userId: string,
  args: { template: TemplateKind; submission?: string; linkedTaskId?: string | null },
) {
  const { data: tasks, error } = await supabase
    .from("tasks")
    .select("id,title,description,status,category,linked_area,linked_module_route")
    .eq("user_id", userId)
    .in("status", ACTIVE_TASK_STATUSES);
  if (error) throw error;

  const matched = ((tasks ?? []) as TaskRow[]).filter((task) => {
    if (args.linkedTaskId && task.id === args.linkedTaskId) return true;
    if (args.linkedTaskId && args.template === "change_request") return false;
    return matchesArtifact(task, args.template);
  });
  if (matched.length === 0) return { updated: 0, taskIds: [] as string[] };

  const update: Record<string, unknown> = {
    status: "submitted",
    submitted_at: new Date().toISOString(),
  };
  if (args.submission) update.submission = args.submission;

  const ids = matched.map((task) => task.id);
  const { error: updateError } = await supabase
    .from("tasks")
    .update(update)
    .eq("user_id", userId)
    .in("id", ids);
  if (updateError) throw updateError;
  return { updated: ids.length, taskIds: ids };
}

export async function reconcileSubmittedArtifactTasks(supabase: any, userId: string) {
  // Approved deliverables close their originating task outright, so completed
  // initiation/planning work stops lingering on the board in later phases.
  await reconcileApprovedArtifactTasks(supabase, userId);
  try {
    const { data: report } = await supabase
      .from("status_reports")
      .select("week_start,rag_summary,achievements,next_week,risks_blockers,decisions_needed,budget_note,submitted_at")
      .eq("user_id", userId)
      .not("submitted_at", "is", null)
      .order("submitted_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (report) {
      const values = {
        period: `Week of ${report.week_start ?? "current"}`,
        rag: report.rag_summary ?? "amber",
        achievements: report.achievements ?? "",
        next_week: report.next_week ?? "",
        risks_blockers: report.risks_blockers ?? "",
        decisions_needed: report.decisions_needed ?? "",
        budget_note: report.budget_note ?? "",
      };
      await markSubmittedArtifactTasks(supabase, userId, {
        template: "status_report",
        submission: encodeSubmission({ kind: "template", template: "status_report", values, readiness: evaluateStatusReport(values) }),
      });
    }
  } catch (error) {
    console.error("status-report task reconciliation failed", error);
  }

  try {
    const { data: charter } = await supabase
      .from("project_charters")
      .select("payload,submitted_at")
      .eq("user_id", userId)
      .not("submitted_at", "is", null)
      .maybeSingle();
    if (charter) {
      const values = (charter.payload ?? {}) as Record<string, string>;
      await markSubmittedArtifactTasks(supabase, userId, {
        template: "project_charter",
        submission: encodeSubmission({ kind: "template", template: "project_charter", values, readiness: evaluateCharter(values) }),
      });
    }
  } catch (error) {
    console.error("charter task reconciliation failed", error);
  }

  try {
    const { data: register } = await supabase
      .from("stakeholder_registers")
      .select("payload,submitted_at")
      .eq("user_id", userId)
      .not("submitted_at", "is", null)
      .maybeSingle();
    if (register) {
      const values = (register.payload ?? {}) as Record<string, string>;
      await markSubmittedArtifactTasks(supabase, userId, {
        template: "stakeholder_register",
        submission: encodeSubmission({
          kind: "template",
          template: "stakeholder_register",
          values,
          readiness: evaluateGenericTemplate("stakeholder_register", values),
        }),
      });
    }
  } catch (error) {
    console.error("stakeholder-register task reconciliation failed", error);
  }

  try {
    const { data: lessons } = await supabase
      .from("lessons_learned_docs")
      .select("payload,submitted_at")
      .eq("user_id", userId)
      .not("submitted_at", "is", null)
      .maybeSingle();
    if (lessons) {
      const values = (lessons.payload ?? {}) as Record<string, string>;
      await markSubmittedArtifactTasks(supabase, userId, {
        template: "lessons_learned",
        submission: encodeSubmission({
          kind: "template",
          template: "lessons_learned",
          values,
          readiness: evaluateGenericTemplate("lessons_learned", values),
        }),
      });
    }
  } catch (error) {
    console.error("lessons task reconciliation failed", error);
  }
}