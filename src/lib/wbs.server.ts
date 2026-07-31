// Governance rule: a Project Schedule that reads as dates-only cannot be
// approved. When that happens the reviewer asks for a formal Work Breakdown
// Structure before signing off the schedule. Server-only helper.

type Doc = { id: string; title: string | null };

const WBS_ID_RX = /(^|\s)\d+\.\d+(\.\d+)?(\s|:|—|-|\))/g;

export function scheduleLacksTaskDetail(excerpt: string): boolean {
  const text = excerpt ?? "";
  const ids = text.match(WBS_ID_RX)?.length ?? 0;
  const hasWorkPackages = /work package|work breakdown|\bwbs\b|deliverable owner|acceptance criteri/i.test(text);
  const bulletLines = text
    .split("\n")
    .filter((l) => /^\s*([-*•]|\d+[.)])\s+\S/.test(l)).length;
  // Enough decomposition already? Then no WBS is requested.
  if (hasWorkPackages && ids >= 4) return false;
  return ids < 6 || bulletLines < 10;
}

export function isScheduleDoc(title: string | null | undefined): boolean {
  return /schedule|timeline|gantt|project plan/i.test(title ?? "");
}

/**
 * Conditionally raises a governance request for a WBS. Returns true when a
 * request was created. Idempotent: never duplicates the task or the email.
 */
export async function maybeRequestWbs(
  supabase: any,
  userId: string,
  doc: Doc,
  excerpt: string,
  score: number,
): Promise<boolean> {
  if (!isScheduleDoc(doc.title)) return false;
  if (!scheduleLacksTaskDetail(excerpt)) return false;

  // Already delivered a WBS? Nothing to request.
  const { data: wbsDocs } = await supabase
    .from("documents")
    .select("id")
    .eq("user_id", userId)
    .ilike("title", "%work breakdown%")
    .limit(1);
  if (wbsDocs && wbsDocs.length > 0) return false;

  // Already asked?
  const { data: existingTask } = await supabase
    .from("tasks")
    .select("id,status")
    .eq("user_id", userId)
    .ilike("title", "%work breakdown%")
    .limit(1);
  if (existingTask && existingTask.length > 0) return false;

  await supabase.from("tasks").insert({
    user_id: userId,
    title: "Produce a Work Breakdown Structure (WBS)",
    description:
      "Governance has asked for a formal WBS before the Project Schedule can be approved. Decompose the deliverables into Level 1 work packages and Level 2 tasks with IDs, owners and acceptance criteria, then revise and resubmit the schedule if needed.",
    priority: "high",
    category: "planning",
    linked_area: "documents",
    linked_module_route: "/app/template/wbs",
    completion_action:
      "Submit a WBS that shows every schedule milestone traced back to numbered work packages with named owners and testable acceptance criteria.",
    source: "system",
  });

  await supabase.from("inbox_messages").insert({
    user_id: userId,
    sender_name: "Emma Collins",
    sender_role: "Programme Manager (Governance Review)",
    subject: "Schedule review — WBS required before approval",
    tone: "neutral",
    body: `Thanks for submitting the schedule — the sequencing and dates are a reasonable starting point (review score ${score}/100).

I can't take it to the board as it stands. It tells me *when* things happen, but not *what* is actually being delivered underneath each milestone. Before I approve it, please produce a formal Work Breakdown Structure: deliverables, Level 1 work packages, Level 2 tasks with IDs (1.1, 1.2, 2.1…), a named owner per package and acceptance criteria for each.

Once the WBS is in, revise the schedule if the decomposition changes anything and resubmit. This isn't a rejection — it's the level of detail governance needs to hold anyone accountable to those dates.

Emma`,
  });

  return true;
}
