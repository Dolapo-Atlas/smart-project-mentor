// Shared sponsor/governance review for template-based artifacts.
// Gives every submitted deliverable a real lifecycle:
//   draft -> submitted -> under_review -> approved | changes_requested
import { z } from "zod";
import { generateObject } from "ai";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";
import { recordArtifactVersion, updateLatestArtifact, payloadToMarkdown } from "./artifact-store.server";
import { projectFactsPrompt, factsFor } from "./project-facts";

const MODEL = "google/gemini-3-flash-preview";

const ReviewSchema = z.object({
  score: z.number().int().min(0).max(100),
  decision: z.enum(["approved", "changes_requested"]),
  comment: z.string().max(700),
  required_changes: z.array(z.string().max(200)).max(5),
  strengths: z.array(z.string().max(200)).max(4),
});

export type ArtifactReview = z.infer<typeof ReviewSchema>;

export type ReviewArtifactArgs = {
  artifact_type: string;
  title: string;
  payload: Record<string, string | unknown>;
  completion_pct: number;
  source_table: string;
  source_id: string;
  linked_task_id?: string | null;
  reviewer_name?: string;
  reviewer_role?: string;
  project_name?: string;
};

const PASS_SCORE = 60;

function fallbackReview(args: ReviewArtifactArgs): ArtifactReview {
  const approved = args.completion_pct >= 70;
  return {
    score: approved ? 68 : 45,
    decision: approved ? "approved" : "changes_requested",
    comment: approved
      ? `Approved. ${args.title} is complete enough to govern the next stage of work.`
      : `Not approved yet. ${args.title} still has gaps — fill in the outstanding sections and resubmit.`,
    required_changes: approved ? [] : ["Complete the remaining required sections", "Add named owners and dates"],
    strengths: approved ? ["Covers the core sections a sponsor expects"] : [],
  };
}

/**
 * Runs a governance review on a submitted artifact, persists the decision on the
 * source row, versions it into the deliverables library, updates the linked task
 * and writes a reviewer email into the learner's inbox.
 */
export async function reviewArtifact(
  supabase: any,
  userId: string,
  args: ReviewArtifactArgs,
): Promise<{ review: ArtifactReview; version: number }> {
  const reviewerName = args.reviewer_name ?? "David Okafor";
  const reviewerRole = args.reviewer_role ?? "Executive Sponsor";

  const content = payloadToMarkdown(args.title, args.payload as Record<string, unknown>);

  // Authoritative, sponsor-approved project facts. The reviewer must judge the
  // artifact AGAINST these constraints, never challenge the premise itself.
  let slug: string | null = null;
  let projectName = args.project_name ?? null;
  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("current_project_instance_id")
      .eq("id", userId)
      .maybeSingle();
    if (profile?.current_project_instance_id) {
      const { data: inst } = await supabase
        .from("project_instances")
        .select("display_name, project_templates(slug, title)")
        .eq("id", profile.current_project_instance_id)
        .maybeSingle();
      slug = (inst as any)?.project_templates?.slug ?? null;
      projectName = projectName ?? (inst as any)?.display_name ?? (inst as any)?.project_templates?.title ?? null;
    }
  } catch (e) {
    console.error("artifact review project lookup failed", e);
  }
  const facts = factsFor(slug);
  const factsBlock = projectFactsPrompt({ slug });

  const { version } = await recordArtifactVersion(supabase, userId, {
    artifact_type: args.artifact_type,
    title: args.title,
    payload: args.payload as Record<string, unknown>,
    content_markdown: content,
    status: "under_review",
    source_table: args.source_table,
    source_id: args.source_id,
    reviewer_name: reviewerName,
  });

  let review: ArtifactReview;
  try {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");
    const model = createLovableAiGatewayProvider(key)(MODEL);
    const { object } = await generateObject({
      model,
      schema: ReviewSchema,
      prompt: `You are ${reviewerName}, ${reviewerRole} on the project${
        projectName ? ` "${projectName}"` : ""
      }. You are reviewing a Project Coordinator's "${args.title}" (version ${version}, ${args.completion_pct}% complete).

APPROVED PROJECT FACTS (fixed, already signed off by the board — these are NOT up for debate):
${factsBlock}
Simulated project duration: ${facts.durationDays} calendar days (${facts.timelineLabel}) end to end.

HOW TO REVIEW:
- Treat the facts above as settled. Do NOT challenge the premise, feasibility, budget adequacy, scope size or the ${facts.durationDays}-day window. A ${facts.timelineLabel} delivery inside this envelope is achievable and board-approved.
- Judge only whether the coordinator's document is CONSISTENT with those facts (correct budget, currency, timeline, footprint, vendor) and whether it is specific, complete and usable.
- If the document contradicts an approved fact, say which fact it contradicts and what the correct figure is.
- Never request changes solely because you think the timeline or budget is unrealistic.

Submission:
${content}

Judge it the way a real sponsor would: are objectives, scope, owners, dates, risks and decision rights clear, specific and consistent with the approved facts? Approve when it is genuinely usable to govern the work (score >= ${PASS_SCORE}). Otherwise request changes and list the specific, actionable changes required. Write the comment in first person, warm but direct, max 4 sentences.`,
    });
    review = object;
    if (review.score >= PASS_SCORE) review.decision = "approved";
    else review.decision = "changes_requested";
  } catch (e) {
    console.error("artifact review AI failed", e);
    review = fallbackReview(args);
  }

  const approved = review.decision === "approved";
  const now = new Date().toISOString();

  await updateLatestArtifact(supabase, userId, args.artifact_type, {
    status: approved ? "approved" : "changes_requested",
    review_result: review as unknown as Record<string, unknown>,
    reviewer_name: reviewerName,
  });

  // Persist the decision on the source row (charter / register / lessons ...)
  try {
    const patch: Record<string, unknown> = {
      approval_status: approved ? "approved" : "changes_requested",
      sponsor_comment: review.comment,
    };
    if (approved) patch.approved_at = now;
    // Some tables carry a separate lifecycle `status` column.
    const withStatus = ["project_charters", "lessons_learned_docs"];
    if (withStatus.includes(args.source_table)) {
      patch.status = approved ? "approved" : "changes_requested";
    }
    await supabase.from(args.source_table).update(patch).eq("id", args.source_id).eq("user_id", userId);
  } catch (e) {
    console.error("artifact source update failed", e);
  }

  // Linked task follows the artifact decision.
  if (args.linked_task_id) {
    try {
      await supabase
        .from("tasks")
        .update(
          approved
            ? {
                status: "approved",
                completed_at: now,
                feedback: {
                  score: Math.max(1, Math.min(5, Math.round(review.score / 20))),
                  did_well: review.strengths[0] ?? "Delivered the artifact to a governable standard.",
                  improve: review.required_changes[0] ?? "Keep evidence and owners explicit.",
                  real_world: review.comment,
                  skill: args.title,
                },
              }
            : { status: "changes_requested", completed_at: null },
        )
        .eq("id", args.linked_task_id)
        .eq("user_id", userId);
    } catch (e) {
      console.error("artifact linked task update failed", e);
    }
  }

  // Reviewer email
  try {
    const bullets = (approved ? review.strengths : review.required_changes)
      .map((line) => `• ${line}`)
      .join("\n");
    await supabase.from("inbox_messages").insert({
      user_id: userId,
      sender_name: reviewerName,
      sender_role: reviewerRole,
      subject: `${approved ? "Approved" : "Changes requested"}: ${args.title} v${version}`,
      body: `${review.comment}\n\n${bullets}${
        approved
          ? "\n\nI've signed this off — it's now in your project deliverables."
          : "\n\nUpdate it and resubmit and I'll look again."
      }`,
      tone: approved ? "supportive" : "pressuring",
      read: false,
    });
  } catch (e) {
    console.error("artifact review inbox insert failed", e);
  }

  return { review, version };
}