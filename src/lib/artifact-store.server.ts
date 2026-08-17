// Deliverables library: every submitted/approved artifact is versioned here so
// the learner keeps a permanent, exportable record of their project work.

export type ArtifactStatus = "submitted" | "under_review" | "approved" | "changes_requested";

export type RecordArtifactArgs = {
  artifact_type: string;
  title: string;
  payload: Record<string, unknown>;
  content_markdown?: string | null;
  status?: ArtifactStatus;
  source_table?: string | null;
  source_id?: string | null;
  review_result?: Record<string, unknown> | null;
  reviewer_name?: string | null;
};

async function activeContext(supabase: any, userId: string) {
  const { data: profile } = await supabase
    .from("profiles")
    .select("current_project_instance_id,role,display_name,preferred_name,first_name")
    .eq("id", userId)
    .maybeSingle();
  let projectName: string | null = null;
  const instanceId: string | null = profile?.current_project_instance_id ?? null;
  if (instanceId) {
    const { data: inst } = await supabase
      .from("project_instances")
      .select("display_name,project_templates(title)")
      .eq("id", instanceId)
      .maybeSingle();
    projectName = inst?.display_name ?? (inst as any)?.project_templates?.title ?? null;
  }
  return {
    instanceId,
    projectName,
    role: (profile?.role as string | null) ?? null,
  };
}

/** Insert a new version of an artifact, demoting any previous latest row. */
export async function recordArtifactVersion(
  supabase: any,
  userId: string,
  args: RecordArtifactArgs,
) {
  const ctx = await activeContext(supabase, userId);
  const now = new Date().toISOString();

  let query = supabase
    .from("project_artifacts")
    .select("version")
    .eq("user_id", userId)
    .eq("artifact_type", args.artifact_type)
    .order("version", { ascending: false })
    .limit(1);
  if (ctx.instanceId) query = query.eq("project_instance_id", ctx.instanceId);
  const { data: prev } = await query.maybeSingle();
  const version = (prev?.version ?? 0) + 1;

  let demote = supabase
    .from("project_artifacts")
    .update({ is_latest: false })
    .eq("user_id", userId)
    .eq("artifact_type", args.artifact_type);
  if (ctx.instanceId) demote = demote.eq("project_instance_id", ctx.instanceId);
  await demote;

  const status = args.status ?? "submitted";
  const { data, error } = await supabase
    .from("project_artifacts")
    .insert({
      user_id: userId,
      project_instance_id: ctx.instanceId,
      project_name: ctx.projectName,
      simulated_role: ctx.role,
      artifact_type: args.artifact_type,
      title: args.title,
      payload: args.payload,
      content_markdown: args.content_markdown ?? null,
      status,
      version,
      is_latest: true,
      submitted_at: now,
      approved_at: status === "approved" ? now : null,
      source_table: args.source_table ?? null,
      source_id: args.source_id ?? null,
      review_result: args.review_result ?? null,
      reviewer_name: args.reviewer_name ?? null,
    })
    .select("id,version")
    .maybeSingle();
  if (error) throw error;
  return { id: data?.id as string | undefined, version };
}

/** Update the latest version of an artifact after a review decision. */
export async function updateLatestArtifact(
  supabase: any,
  userId: string,
  artifactType: string,
  patch: {
    status: ArtifactStatus;
    review_result?: Record<string, unknown> | null;
    reviewer_name?: string | null;
  },
) {
  const ctx = await activeContext(supabase, userId);
  let q = supabase
    .from("project_artifacts")
    .update({
      status: patch.status,
      review_result: patch.review_result ?? null,
      reviewer_name: patch.reviewer_name ?? null,
      approved_at: patch.status === "approved" ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("artifact_type", artifactType)
    .eq("is_latest", true);
  if (ctx.instanceId) q = q.eq("project_instance_id", ctx.instanceId);
  await q;
}

export function payloadToMarkdown(title: string, payload: Record<string, unknown>) {
  const lines = [`# ${title}`, ""];
  for (const [key, value] of Object.entries(payload)) {
    if (value === null || value === undefined || value === "") continue;
    const label = key
      .replace(/[_-]+/g, " ")
      .replace(/\b\w/g, (m) => m.toUpperCase());
    const body =
      typeof value === "string" ? value : JSON.stringify(value, null, 2);
    lines.push(`## ${label}`, "", body.trim(), "");
  }
  return lines.join("\n");
}