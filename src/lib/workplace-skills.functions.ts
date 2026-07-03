import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

/**
 * Workplace Tools layer — teaches users the workflows behind industry-standard
 * software (Jira, Confluence, Monday.com, Microsoft Project, Teams, Outlook)
 * through the Atlas simulation. We never rebrand as those tools; we track the
 * transferable skill so users can walk into any workplace and recognise the
 * pattern.
 */

export type ToolFamily =
  | "Jira"
  | "Confluence"
  | "Monday"
  | "MS Project"
  | "Teams"
  | "Outlook"
  | "RAID"
  | "Governance"
  | "Agile";

export type SkillDef = {
  key: string;
  family: ToolFamily;
  label: string;
  atlasFeature: string;
  atlasRoute?: string;
  description: string;
};

export const SKILL_CATALOG: SkillDef[] = [
  { key: "jira.ticket.create", family: "Jira", label: "Create and assign tickets", atlasFeature: "Tasks", atlasRoute: "/app/tasks", description: "Create a task, assign an owner, set priority — exactly like raising a Jira ticket." },
  { key: "jira.status.move", family: "Jira", label: "Move work through statuses", atlasFeature: "Tasks", atlasRoute: "/app/tasks", description: "Move work To Do → In Progress → Done. Same lifecycle as any Jira / Azure DevOps board." },
  { key: "jira.blocked", family: "Jira", label: "Flag blocked work", atlasFeature: "Tasks", atlasRoute: "/app/tasks", description: "Mark tasks blocked and surface the dependency — the language every engineering team uses." },
  { key: "jira.comments", family: "Jira", label: "Comment on tickets", atlasFeature: "Tasks", atlasRoute: "/app/tasks", description: "Leave context on a ticket so async teammates can pick it up." },

  { key: "confluence.charter", family: "Confluence", label: "Author a project charter", atlasFeature: "Documents", atlasRoute: "/app/documents", description: "Draft the founding doc every project needs. Confluence, Notion, SharePoint — same document." },
  { key: "confluence.meeting.notes", family: "Confluence", label: "Publish meeting notes", atlasFeature: "Meetings", atlasRoute: "/app/meetings", description: "Capture decisions and actions so nothing lives only in someone's head." },
  { key: "confluence.decisions", family: "Confluence", label: "Document decisions", atlasFeature: "Documents", atlasRoute: "/app/documents", description: "Record why a decision was made, not just what — the discipline of a project wiki." },

  { key: "monday.board.update", family: "Monday", label: "Update a project board", atlasFeature: "Tasks", atlasRoute: "/app/tasks", description: "Keep the board honest — status, owner, next step. Monday, Asana, ClickUp all live off this." },
  { key: "monday.deadlines", family: "Monday", label: "Track deadlines", atlasFeature: "Progress", atlasRoute: "/app/progress", description: "Watch what's due, what's late, what's next." },

  { key: "msproject.milestones", family: "MS Project", label: "Work to milestones", atlasFeature: "Phase gates", atlasRoute: "/app/gates", description: "Hit the gate. Milestones and phase gates are the same idea in Microsoft Project, Smartsheet or Primavera." },
  { key: "msproject.critical.path", family: "MS Project", label: "Critical path awareness", atlasFeature: "RAID", atlasRoute: "/app/raid", description: "Spot the tasks that, if they slip, slip the whole project." },
  { key: "msproject.schedule.variance", family: "MS Project", label: "Report schedule variance", atlasFeature: "Status reports", atlasRoute: "/app/reports", description: "Explain plan vs actual in a language sponsors trust." },

  { key: "teams.escalate", family: "Teams", label: "Escalate professionally", atlasFeature: "Comms", atlasRoute: "/app/comms", description: "Raise a blocker to a sponsor without burning the relationship." },
  { key: "teams.standup", family: "Teams", label: "Run / respond to standups", atlasFeature: "Meetings", atlasRoute: "/app/meetings", description: "Yesterday / today / blockers — the muscle of every agile team." },

  { key: "outlook.thread", family: "Outlook", label: "Manage an email thread", atlasFeature: "Inbox", atlasRoute: "/app/inbox", description: "Read the thread, reply to the right people, keep the CC list honest." },
  { key: "outlook.exec.comms", family: "Outlook", label: "Write to executives", atlasFeature: "Comms", atlasRoute: "/app/comms", description: "Short, structured, decision-oriented — the format execs actually read." },

  { key: "raid.risk", family: "RAID", label: "Log and manage risks", atlasFeature: "RAID log", atlasRoute: "/app/raid", description: "Name a risk, own it, mitigate it — the core PM discipline." },
  { key: "raid.issue", family: "RAID", label: "Turn issues into actions", atlasFeature: "RAID log", atlasRoute: "/app/raid", description: "When a risk becomes real, work it through to closure." },

  { key: "governance.change", family: "Governance", label: "Run a change request", atlasFeature: "Change requests", atlasRoute: "/app/changes", description: "Scope change without chaos — the change-control workflow every PMO expects." },
  { key: "governance.gate", family: "Governance", label: "Pass a phase gate", atlasFeature: "Phase gates", atlasRoute: "/app/gates", description: "Get formal sign-off to move from one phase to the next." },

  { key: "agile.task.mgmt", family: "Agile", label: "Agile task management", atlasFeature: "Tasks", atlasRoute: "/app/tasks", description: "Small batches, clear owners, visible progress." },
];

const AwardSchema = z.object({
  skill_key: z.string().min(1).max(120),
  source: z.string().max(200).optional(),
});

export const awardSkill = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => AwardSchema.parse(d))
  .handler(async ({ data, context }) => {
    const def = SKILL_CATALOG.find((s) => s.key === data.skill_key);
    if (!def) throw new Error("Unknown skill");
    const { supabase, userId } = context;
    const now = new Date().toISOString();

    const { data: existing } = await supabase
      .from("workplace_skills" as any)
      .select("id, times_practised")
      .eq("user_id", userId)
      .eq("skill_key", def.key)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from("workplace_skills" as any)
        .update({
          times_practised: ((existing as any).times_practised ?? 0) + 1,
          last_practised_at: now,
          source: data.source ?? null,
        })
        .eq("id", (existing as any).id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from("workplace_skills" as any).insert({
        user_id: userId,
        skill_key: def.key,
        tool_family: def.family,
        label: def.label,
        source: data.source ?? null,
      });
      if (error) throw error;
    }
    return { ok: true };
  });

/**
 * Returns the full catalog plus, for each skill, whether the user has practised
 * it (either from explicit awards OR heuristically from their existing Atlas
 * activity — so users who joined before this layer still see credit).
 */
export const getSkillMap = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const { data: earned } = await supabase
      .from("workplace_skills" as any)
      .select("skill_key, times_practised, first_earned_at, last_practised_at")
      .eq("user_id", userId);

    const earnedMap = new Map<string, { times: number; first: string; last: string }>();
    for (const row of (earned ?? []) as any[]) {
      earnedMap.set(row.skill_key, {
        times: row.times_practised,
        first: row.first_earned_at,
        last: row.last_practised_at,
      });
    }

    const [tasks, docs, raid, reports, gates, meetings, comms, changes] = await Promise.all([
      supabase.from("tasks").select("status").eq("user_id", userId),
      supabase.from("documents").select("id", { count: "exact", head: true }).eq("user_id", userId),
      supabase.from("raid_items").select("id", { count: "exact", head: true }).eq("user_id", userId),
      supabase.from("status_reports").select("id", { count: "exact", head: true }).eq("user_id", userId),
      supabase.from("phase_gates").select("id", { count: "exact", head: true }).eq("user_id", userId),
      supabase.from("meetings").select("id", { count: "exact", head: true }).eq("user_id", userId),
      supabase.from("comms_messages").select("id", { count: "exact", head: true }).eq("user_id", userId),
      supabase.from("change_requests").select("id", { count: "exact", head: true }).eq("user_id", userId),
    ]);

    const taskRows = (tasks.data ?? []) as { status: string | null }[];
    const anyTask = taskRows.length > 0;
    const anyMoved = taskRows.some((t) => t.status && !["todo", "pending", "to_do"].includes(t.status));
    const anyDone = taskRows.some((t) => t.status === "done" || t.status === "completed");

    const heuristic: Record<string, boolean> = {
      "jira.ticket.create": anyTask,
      "jira.status.move": anyMoved,
      "jira.blocked": taskRows.some((t) => t.status === "blocked"),
      "jira.comments": false,
      "monday.board.update": anyMoved,
      "monday.deadlines": anyDone,
      "agile.task.mgmt": anyDone,
      "confluence.charter": (docs.count ?? 0) > 0,
      "confluence.meeting.notes": (meetings.count ?? 0) > 0,
      "confluence.decisions": (docs.count ?? 0) > 1,
      "raid.risk": (raid.count ?? 0) > 0,
      "raid.issue": (raid.count ?? 0) > 1,
      "msproject.milestones": (gates.count ?? 0) > 0,
      "msproject.critical.path": (raid.count ?? 0) > 0,
      "msproject.schedule.variance": (reports.count ?? 0) > 0,
      "teams.escalate": (comms.count ?? 0) > 0,
      "teams.standup": (meetings.count ?? 0) > 1,
      "outlook.thread": true,
      "outlook.exec.comms": (comms.count ?? 0) > 0,
      "governance.change": (changes.count ?? 0) > 0,
      "governance.gate": (gates.count ?? 0) > 0,
    };

    const items = SKILL_CATALOG.map((def) => {
      const rec = earnedMap.get(def.key);
      const inferred = heuristic[def.key] ?? false;
      return {
        ...def,
        earned: !!rec || inferred,
        source: rec ? ("practised" as const) : inferred ? ("inferred" as const) : ("not_yet" as const),
        times: rec?.times ?? (inferred ? 1 : 0),
        first_earned_at: rec?.first ?? null,
        last_practised_at: rec?.last ?? null,
      };
    });

    const byFamily = new Map<ToolFamily, typeof items>();
    for (const item of items) {
      const list = byFamily.get(item.family) ?? [];
      list.push(item);
      byFamily.set(item.family, list);
    }
    const families = Array.from(byFamily.entries()).map(([family, list]) => ({
      family,
      total: list.length,
      earned: list.filter((i) => i.earned).length,
      items: list,
    }));

    return {
      totalSkills: items.length,
      earnedCount: items.filter((i) => i.earned).length,
      families,
    };
  });
