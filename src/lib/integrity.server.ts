/**
 * Simulation Integrity Audit.
 *
 * Deterministic (no AI, no cost) checks that answer one question: is the
 * simulation telling learners consistent, non-contradictory things from
 * initiation to closure? Two families of checks:
 *
 *  1. CONFIGURATION  — templates, chapters, roster, routes, fact registry.
 *  2. GENERATED CONTENT — what the AI has actually written into learners'
 *     inboxes / comms threads, checked against the authoritative facts.
 *
 * Everything runs read-only against the service-role client so it sees all
 * learners, not just the admin's own rows.
 */
import { PROJECT_FACTS_BY_SLUG, factsFor } from "./project-facts";
import { TEMPLATES } from "./templates";

export type Severity = "critical" | "warning" | "info";

export type Finding = {
  id: string;
  area: string;
  severity: Severity;
  title: string;
  detail: string;
  count: number;
  samples: string[];
};

export type AuditReport = {
  ranAt: string;
  checksRun: number;
  scanned: { templates: number; chapters: number; instances: number; messages: number; tasks: number };
  findings: Finding[];
  summary: { critical: number; warning: number; info: number; clean: string[] };
};

/** Every module route a task or milestone is allowed to deep-link to. */
export const KNOWN_MODULE_ROUTES = new Set<string>([
  "/app",
  "/app/account",
  "/app/budget",
  "/app/changes",
  "/app/charter",
  "/app/comms",
  "/app/completed",
  "/app/documents",
  "/app/gantt",
  "/app/gates",
  "/app/health",
  "/app/inbox",
  "/app/learning",
  "/app/lessons",
  "/app/meetings",
  "/app/progress",
  "/app/projects",
  "/app/raid",
  "/app/reports",
  "/app/results",
  "/app/reviews",
  "/app/settings",
  "/app/stakeholders",
  "/app/tasks",
  "/app/templates",
  "/app/workplace-tools",
]);

const HEALTH_WORDS =
  /\b(care home|care-home|caresoft|patient|patients|clinical|nhs|oakwood|resident record|digital care records)\b/i;
const FOREIGN_CURRENCY = /(\bUSD\b|\bEUR\b|\bNGN\b|\bINR\b|US\$|\$\s?\d|€\s?\d|₦\s?\d|₹\s?\d)/;
const PLACEHOLDER = /\[(?:[A-Za-z][^\]\n]{2,40})\]/;
const GBP_AMOUNT = /£\s?([\d,]+(?:\.\d+)?)\s*(m|million|k)?/gi;

function parseGbp(raw: string, unit?: string): number {
  const n = Number(raw.replace(/,/g, ""));
  if (!Number.isFinite(n)) return NaN;
  const u = (unit ?? "").toLowerCase();
  if (u === "m" || u === "million") return n * 1_000_000;
  if (u === "k") return n * 1_000;
  return n;
}

function snip(s: string, max = 160): string {
  const one = (s ?? "").replace(/\s+/g, " ").trim();
  return one.length > max ? `${one.slice(0, max)}…` : one;
}

function finding(f: Omit<Finding, "count"> & { count?: number }): Finding {
  return { ...f, count: f.count ?? f.samples.length };
}

/* ─────────────────────────── the audit ─────────────────────────── */

export async function runIntegrityAudit(): Promise<AuditReport> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const db = supabaseAdmin as any;
  const findings: Finding[] = [];
  const clean: string[] = [];
  let checksRun = 0;
  const check = (label: string, hits: Finding[]) => {
    checksRun += 1;
    if (hits.length === 0) clean.push(label);
    else findings.push(...hits);
  };

  const [{ data: templates }, { data: chapters }, { data: instances }] = await Promise.all([
    db.from("project_templates").select("*"),
    db.from("project_chapters").select("template_id, chapter_number, slug, title, unlock_after_chapter"),
    db
      .from("project_instances")
      .select("id, user_id, template_id, current_phase, progress_pct, status, seeded, completed_at"),
  ]);

  const tplById = new Map<string, any>((templates ?? []).map((t: any) => [t.id, t]));
  const playable = (templates ?? []).filter((t: any) => t.is_playable);

  /* 1 — fact registry coverage */
  check(
    "Fact registry covers every playable project",
    (() => {
      const missing = playable.filter((t: any) => !PROJECT_FACTS_BY_SLUG[t.slug]);
      return missing.length
        ? [
            finding({
              id: "facts-coverage",
              area: "Facts",
              severity: "critical",
              title: "Playable project has no authoritative fact set",
              detail:
                "Stakeholders and Ask Atlas fall back to the Digital Care Records figures for these projects, so learners can be quoted the wrong budget, timeline or vendor.",
              samples: missing.map((t: any) => `${t.slug} — ${t.title}`),
            }),
          ]
        : [];
    })(),
  );

  /* 2 — chapter structure */
  {
    const hits: Finding[] = [];
    const byTpl = new Map<string, any[]>();
    for (const c of chapters ?? []) {
      const arr = byTpl.get(c.template_id) ?? [];
      arr.push(c);
      byTpl.set(c.template_id, arr);
    }
    const noChapters = playable.filter((t: any) => (byTpl.get(t.id)?.length ?? 0) === 0);
    if (noChapters.length)
      hits.push(
        finding({
          id: "chapters-missing",
          area: "Journey",
          severity: "critical",
          title: "Playable project has no chapters",
          detail:
            "A learner can start this project but there is no chapter spine, so progress, phase gates and 'actions remaining' cannot be computed.",
          samples: noChapters.map((t: any) => `${t.slug} — ${t.title}`),
        }),
      );

    const mismatch: string[] = [];
    const gaps: string[] = [];
    const badUnlock: string[] = [];
    for (const t of templates ?? []) {
      const rows = (byTpl.get(t.id) ?? []).slice().sort((a, b) => a.chapter_number - b.chapter_number);
      if (rows.length === 0) continue;
      if (typeof t.chapters_count === "number" && t.chapters_count !== rows.length)
        mismatch.push(`${t.slug}: chapters_count=${t.chapters_count} but ${rows.length} chapters exist`);
      rows.forEach((r, i) => {
        if (r.chapter_number !== i + 1)
          gaps.push(`${t.slug}: expected chapter ${i + 1}, found ${r.chapter_number} (${r.slug})`);
        if (r.unlock_after_chapter != null && (r.unlock_after_chapter < 1 || r.unlock_after_chapter >= r.chapter_number))
          badUnlock.push(`${t.slug} ch${r.chapter_number}: unlock_after_chapter=${r.unlock_after_chapter}`);
      });
    }
    if (mismatch.length)
      hits.push(
        finding({
          id: "chapters-count-drift",
          area: "Journey",
          severity: "warning",
          title: "Chapter count on the project card disagrees with the real chapters",
          detail: "Learners are promised a different number of chapters than the simulation contains.",
          samples: mismatch,
        }),
      );
    if (gaps.length)
      hits.push(
        finding({
          id: "chapters-sequence",
          area: "Journey",
          severity: "critical",
          title: "Chapter numbering has a gap or duplicate",
          detail: "Chapter unlocking walks the sequence, so a gap can dead-end a learner mid-project.",
          samples: gaps,
        }),
      );
    if (badUnlock.length)
      hits.push(
        finding({
          id: "chapters-unlock",
          area: "Journey",
          severity: "critical",
          title: "Chapter unlock rule points at itself or a later chapter",
          detail: "This makes the chapter permanently locked — an unreachable step in the journey.",
          samples: badUnlock,
        }),
      );
    check("Chapter spine is complete and sequential", hits);
  }

  /* 3 — stakeholder roster consistency */
  {
    const hits: Finding[] = [];
    const problems: string[] = [];
    for (const t of templates ?? []) {
      const roster: any[] = Array.isArray(t.stakeholders) ? t.stakeholders : [];
      if (roster.length === 0) {
        problems.push(`${t.slug}: no stakeholder roster — falls back to the care-records cast`);
        continue;
      }
      const roles = new Set(roster.map((r) => String(r.role)));
      for (const required of ["pm", "sponsor"]) {
        if (!roles.has(required)) problems.push(`${t.slug}: roster has no "${required}" role`);
      }
      const names = new Set(roster.map((r) => String(r.name)));
      if (t.pm_name && !names.has(t.pm_name))
        problems.push(`${t.slug}: pm_name "${t.pm_name}" is not in the roster`);
      if (t.sponsor_name && !names.has(t.sponsor_name))
        problems.push(`${t.slug}: sponsor_name "${t.sponsor_name}" is not in the roster`);
    }
    if (problems.length)
      hits.push(
        finding({
          id: "roster-consistency",
          area: "People",
          severity: "warning",
          title: "Stakeholder roster contradicts the project card",
          detail:
            "The named sponsor or project manager on the project card is not the person who emails the learner, which reads as a bug in the workplace fiction.",
          samples: problems,
        }),
      );
    check("Stakeholder rosters match the named sponsor and PM", hits);
  }

  /* 4 — deep links from tasks to modules */
  const { data: taskRows } = await db
    .from("tasks")
    .select("id, title, status, submission, submitted_at, linked_module_route, project_instance_id")
    .limit(5000);

  {
    const bad = new Map<string, string[]>();
    for (const t of taskRows ?? []) {
      const r = t.linked_module_route;
      if (!r) continue;
      if (!KNOWN_MODULE_ROUTES.has(r) && !/^\/app\/template\/[a-z_]+$/.test(r)) {
        const arr = bad.get(r) ?? [];
        if (arr.length < 4) arr.push(t.title);
        bad.set(r, arr);
      }
    }
    check(
      "Every task deep-links to a real module",
      bad.size
        ? [
            finding({
              id: "task-route-broken",
              area: "Navigation",
              severity: "critical",
              title: "Task links to a module route that does not exist",
              detail:
                "\"Open module\" silently drops the learner somewhere else (usually Documents), which is exactly how the journey feels broken.",
              count: [...bad.values()].reduce((s, a) => s + a.length, 0),
              samples: [...bad.entries()].map(([route, titles]) => `${route} ← ${titles.join(", ")}`),
            }),
          ]
        : [],
    );
  }

  /* 5 — template kinds referenced by routes exist */
  {
    const kinds = new Set(Object.keys(TEMPLATES));
    const badKinds = new Set<string>();
    for (const t of taskRows ?? []) {
      const m = /^\/app\/template\/([a-z_]+)$/.exec(t.linked_module_route ?? "");
      if (m && !kinds.has(m[1])) badKinds.add(m[1]);
    }
    check(
      "Every in-app document template referenced by a task exists",
      badKinds.size
        ? [
            finding({
              id: "template-kind-missing",
              area: "Templates",
              severity: "critical",
              title: "Task points at a document template that no longer exists",
              detail: "The learner opens an empty template screen and cannot complete the task.",
              samples: [...badKinds],
            }),
          ]
        : [],
    );
  }

  /* 6 — submitted-but-not-moved tasks (the classic 'why is it still open') */
  {
    const stuck = (taskRows ?? []).filter(
      (t: any) => t.submitted_at && !["submitted", "done", "complete", "completed"].includes(t.status),
    );
    const emptySubmitted = (taskRows ?? []).filter(
      (t: any) => t.status === "submitted" && !t.submission,
    );
    const hits: Finding[] = [];
    if (stuck.length)
      hits.push(
        finding({
          id: "task-submitted-not-moved",
          area: "Tasks",
          severity: "warning",
          title: "Task has a submission but is still shown as open",
          detail:
            "Learners are asked to submit the same work twice. Task sync should reconcile these on load.",
          count: stuck.length,
          samples: stuck.slice(0, 6).map((t: any) => `${t.title} (status: ${t.status})`),
        }),
      );
    if (emptySubmitted.length)
      hits.push(
        finding({
          id: "task-submitted-empty",
          area: "Tasks",
          severity: "info",
          title: "Task marked submitted with no submission stored",
          detail: "Feedback and scoring have nothing to read, so the learner gets generic feedback.",
          count: emptySubmitted.length,
          samples: emptySubmitted.slice(0, 6).map((t: any) => t.title),
        }),
      );
    check("Submitted work is reflected in task status", hits);
  }

  /* 7-10 — what the AI actually wrote to learners */
  const [{ data: inbox }, { data: comms }] = await Promise.all([
    db
      .from("inbox_messages")
      .select("id, subject, body, sender_name, project_instance_id, created_at")
      .order("created_at", { ascending: false })
      .limit(1000),
    db
      .from("comms_messages")
      .select("id, subject, body, direction, from_role, project_instance_id, created_at")
      .order("created_at", { ascending: false })
      .limit(1000),
  ]);

  const messages = [
    ...(inbox ?? []).map((m: any) => ({ ...m, kind: "inbox" as const })),
    ...(comms ?? [])
      .filter((m: any) => m.direction === "in")
      .map((m: any) => ({ ...m, kind: "comms" as const, sender_name: m.from_role })),
  ];

  const instById = new Map<string, any>((instances ?? []).map((i: any) => [i.id, i]));
  const slugOf = (instanceId?: string | null) => {
    const inst = instanceId ? instById.get(instanceId) : null;
    return inst ? (tplById.get(inst.template_id)?.slug ?? "") : "";
  };

  /* 7 — cross-domain leakage */
  {
    const leaks = messages.filter((m) => {
      const slug = slugOf(m.project_instance_id);
      if (!slug || slug === "digital-care-records") return false;
      return HEALTH_WORDS.test(`${m.subject} ${m.body}`);
    });
    check(
      "No care-records language leaking into other projects",
      leaks.length
        ? [
            finding({
              id: "domain-leak",
              area: "AI content",
              severity: "critical",
              title: "Stakeholder wrote care-records content into a different project",
              detail:
                "A CRM or relocation learner is being told about patients or CareSoft. This is the clearest sign the domain guard was not applied on that generation path.",
              count: leaks.length,
              samples: leaks.slice(0, 6).map((m) => `[${slugOf(m.project_instance_id)}] ${m.sender_name}: ${snip(m.subject)} — ${snip(m.body, 110)}`),
            }),
          ]
        : [],
    );
  }

  /* 8 — foreign currency */
  {
    const bad = messages.filter((m) => FOREIGN_CURRENCY.test(`${m.subject} ${m.body}`));
    check(
      "All money quoted in pounds sterling",
      bad.length
        ? [
            finding({
              id: "currency-drift",
              area: "AI content",
              severity: "critical",
              title: "Stakeholder quoted a non-GBP amount",
              detail: "The project is funded in GBP. Any other currency is invented and contradicts the budget module.",
              count: bad.length,
              samples: bad.slice(0, 6).map((m) => `${m.sender_name}: ${snip(m.body, 140)}`),
            }),
          ]
        : [],
    );
  }

  /* 9 — wrong GBP totals */
  {
    const bad: string[] = [];
    for (const m of messages) {
      const facts = factsFor(slugOf(m.project_instance_id));
      const text = `${m.subject} ${m.body}`;
      for (const match of text.matchAll(GBP_AMOUNT)) {
        const value = parseGbp(match[1], match[2]);
        // Only judge headline "whole budget" scale figures.
        if (!Number.isFinite(value) || value < facts.totalBudget * 0.5) continue;
        if (Math.abs(value - facts.totalBudget) > 1) {
          bad.push(`${m.sender_name}: quoted ${match[0]} (approved: £${facts.totalBudget.toLocaleString("en-GB")}) — ${snip(m.subject, 70)}`);
          break;
        }
      }
    }
    check(
      "Headline budget figures match the approved envelope",
      bad.length
        ? [
            finding({
              id: "budget-figure-drift",
              area: "AI content",
              severity: "critical",
              title: "Stakeholder quoted a budget that is not the approved figure",
              detail: "Learners cannot reconcile governance decisions when the sponsor and the budget module disagree.",
              count: bad.length,
              samples: bad.slice(0, 6),
            }),
          ]
        : [],
    );
  }

  /* 10 — unresolved template placeholders */
  {
    const bad = messages.filter((m) => PLACEHOLDER.test(m.body ?? ""));
    check(
      "No unresolved [placeholders] in stakeholder emails",
      bad.length
        ? [
            finding({
              id: "placeholder-leak",
              area: "AI content",
              severity: "warning",
              title: "Email still contains a bracketed placeholder",
              detail:
                "Reads as an unfinished template (e.g. \"Hi [Coordinator's Name]\") and breaks the illusion of a real workplace.",
              count: bad.length,
              samples: bad.slice(0, 6).map((m) => `${m.sender_name}: ${snip(m.body, 140)}`),
            }),
          ]
        : [],
    );
  }

  /* 11 — seeded budget vs approved envelope */
  {
    const { data: lines } = await db
      .from("budget_lines")
      .select("project_instance_id, amount, kind")
      .limit(5000);
    const plannedByInstance = new Map<string, number>();
    for (const l of lines ?? []) {
      if (l.kind !== "planned" || !l.project_instance_id) continue;
      plannedByInstance.set(
        l.project_instance_id,
        (plannedByInstance.get(l.project_instance_id) ?? 0) + Number(l.amount),
      );
    }
    const drift: string[] = [];
    for (const [instanceId, planned] of plannedByInstance) {
      const facts = factsFor(slugOf(instanceId));
      if (planned > 0 && Math.abs(planned - facts.totalBudget) / facts.totalBudget > 0.02) {
        drift.push(
          `${slugOf(instanceId) || "unknown project"}: planned lines total £${Math.round(planned).toLocaleString("en-GB")} vs approved £${facts.totalBudget.toLocaleString("en-GB")}`,
        );
      }
    }
    check(
      "Planned budget lines add up to the approved envelope",
      drift.length
        ? [
            finding({
              id: "budget-plan-drift",
              area: "Budget",
              severity: "warning",
              title: "Seeded budget plan does not add up to the approved budget",
              detail: "The budget page and the Initiation Pack tell the learner two different totals.",
              count: drift.length,
              samples: drift.slice(0, 8),
            }),
          ]
        : [],
    );
  }

  /* 12 — closure integrity */
  {
    const stuckAtEnd = (instances ?? []).filter(
      (i: any) => (i.progress_pct ?? 0) >= 100 && i.status === "active" && !i.completed_at,
    );
    check(
      "Finished projects reach closure",
      stuckAtEnd.length
        ? [
            finding({
              id: "closure-not-reached",
              area: "Closure",
              severity: "warning",
              title: "Project is at 100% but never closed out",
              detail:
                "The learner finished the work and never received the closure/celebration step or their outcome record.",
              count: stuckAtEnd.length,
              samples: stuckAtEnd.slice(0, 6).map((i: any) => `${tplById.get(i.template_id)?.slug ?? i.template_id} · phase ${i.current_phase}`),
            }),
          ]
        : [],
    );
  }

  const severityCount = (s: Severity) => findings.filter((f) => f.severity === s).length;

  return {
    ranAt: new Date().toISOString(),
    checksRun,
    scanned: {
      templates: (templates ?? []).length,
      chapters: (chapters ?? []).length,
      instances: (instances ?? []).length,
      messages: messages.length,
      tasks: (taskRows ?? []).length,
    },
    findings: findings.sort(
      (a, b) =>
        ["critical", "warning", "info"].indexOf(a.severity) - ["critical", "warning", "info"].indexOf(b.severity),
    ),
    summary: {
      critical: severityCount("critical"),
      warning: severityCount("warning"),
      info: severityCount("info"),
      clean,
    },
  };
}
