import { factsFor } from "@/lib/project-facts";

export type CompletionRecommendation = {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  difficulty: string | null;
  durationDays: number | null;
  estimatedHours: string | null;
  simulatedRole: string | null;
  isPlayable: boolean;
};

export type CompletionState = {
  completed: boolean;
  instanceId: string | null;
  templateId: string | null;
  projectName: string;
  learnerName: string;
  simulatedRole: string;
  score: number | null;
  grade: string | null;
  completedAt: string | null;
  durationDays: number | null;
  deliverablesApproved: number;
  credential: {
    issued: boolean;
    code: string | null;
    grade: string | null;
    status: string | null;
  };
  phases: { key: string; label: string; done: boolean }[];
  recommendations: CompletionRecommendation[];
};

const PHASE_ORDER: { key: string; label: string }[] = [
  { key: "initiation", label: "Initiation" },
  { key: "planning", label: "Planning" },
  { key: "execution", label: "Execution" },
  { key: "monitoring", label: "Monitoring & Control" },
  { key: "go-live", label: "Go-Live" },
  { key: "closure", label: "Closure" },
];

function notCompleted(): CompletionState {
  return {
    completed: false,
    instanceId: null,
    templateId: null,
    projectName: "",
    learnerName: "",
    simulatedRole: "",
    score: null,
    grade: null,
    completedAt: null,
    durationDays: null,
    deliverablesApproved: 0,
    credential: { issued: false, code: null, grade: null, status: null },
    phases: PHASE_ORDER.map((p) => ({ ...p, done: false })),
    recommendations: [],
  };
}

/**
 * Read-only completion check. A run counts as complete only when every
 * authoritative signal agrees: Closure phase, a passed Closure gate, a
 * finalised outcome row (score) and an instance marked completed/archived.
 * Progress percentage is deliberately ignored.
 */
export async function readCompletionState(
  supabase: any,
  userId: string,
): Promise<CompletionState> {
  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "current_project_instance_id, first_name, last_name, preferred_name, display_name, role, career_goal",
    )
    .eq("id", userId)
    .maybeSingle();

  const instanceId: string | null = profile?.current_project_instance_id ?? null;
  if (!instanceId) return notCompleted();

  const [instRes, stateRes, gateRes, outcomeRes] = await Promise.all([
    supabase
      .from("project_instances")
      .select("id, status, current_phase, display_name, template_id, started_at, completed_at, project_templates(title, duration_days)")
      .eq("id", instanceId)
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("simulation_state")
      .select("phase, current_day, project_name")
      .eq("user_id", userId)
      .eq("project_instance_id", instanceId)
      .maybeSingle(),
    supabase
      .from("phase_gates")
      .select("status")
      .eq("user_id", userId)
      .eq("project_instance_id", instanceId)
      .eq("phase", "closure")
      .maybeSingle(),
    supabase
      .from("project_outcomes")
      .select("score, grade, completed_at, user_role, template_title")
      .eq("user_id", userId)
      .eq("project_instance_id", instanceId)
      .maybeSingle(),
  ]);

  const inst = instRes.data;
  if (!inst) return notCompleted();

  const phase = String(stateRes.data?.phase ?? inst.current_phase ?? "initiation").toLowerCase();
  const gatePassed = gateRes.data?.status === "passed";
  const outcome = outcomeRes.data;
  const status = String(inst.status ?? "active").toLowerCase();

  const completed =
    phase.startsWith("clos") &&
    gatePassed &&
    !!outcome &&
    typeof outcome.score === "number" &&
    (status === "completed" || status === "archived");

  if (!completed) return notCompleted();

  const [certRes, artRes, tplRes] = await Promise.all([
    supabase
      .from("certificates")
      .select("verification_code, grade, certificate_status")
      .eq("user_id", userId)
      .eq("project_instance_id", instanceId)
      .eq("certificate_status", "valid")
      .order("issued_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("project_artifacts")
      .select("id, artifact_type, status, is_latest")
      .eq("user_id", userId)
      .eq("project_instance_id", instanceId)
      .eq("is_latest", true),
    supabase
      .from("project_templates")
      .select("*")
      .order("sort_order", { ascending: true }),
  ]);

  const artifacts = (artRes.data ?? []) as any[];
  const deliverablesApproved = artifacts.filter(
    (a) => !String(a.artifact_type ?? "").startsWith("task_") && String(a.status) === "approved",
  ).length;

  const projectName =
    inst.display_name || inst.project_templates?.title || stateRes.data?.project_name || "Atlas Simulation";

  const learnerName =
    [profile?.first_name, profile?.last_name].filter(Boolean).join(" ").trim() ||
    profile?.preferred_name ||
    profile?.display_name ||
    "there";

  const simulatedRole =
    outcome?.user_role || profile?.role || profile?.career_goal || "Project Coordinator";

  const facts = factsFor(projectName);
  const durationDays =
    Number(stateRes.data?.current_day) ||
    Number(inst.project_templates?.duration_days) ||
    (facts as any)?.durationDays ||
    null;

  const recommendations: CompletionRecommendation[] = ((tplRes.data ?? []) as any[])
    .filter((t) => t.id !== inst.template_id)
    .map((t) => ({
      id: t.id,
      slug: t.slug,
      title: t.title,
      description: t.description,
      category: t.category,
      difficulty: t.difficulty ?? null,
      durationDays: t.duration_days ?? null,
      estimatedHours: t.estimated_hours ?? null,
      simulatedRole: t.pm_role ?? null,
      isPlayable: !!t.is_playable,
    }));

  return {
    completed: true,
    instanceId,
    templateId: inst.template_id ?? null,
    projectName,
    learnerName,
    simulatedRole,
    score: outcome.score,
    grade: outcome.grade ?? null,
    completedAt: outcome.completed_at ?? inst.completed_at ?? null,
    durationDays,
    deliverablesApproved,
    credential: {
      issued: !!certRes.data,
      code: certRes.data?.verification_code ?? null,
      grade: certRes.data?.grade ?? null,
      status: certRes.data?.certificate_status ?? null,
    },
    phases: PHASE_ORDER.map((p) => ({ ...p, done: true })),
    recommendations,
  };
}
