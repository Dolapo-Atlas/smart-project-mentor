import { createFileRoute, Link } from "@tanstack/react-router";
import { BarChart3, FileText, Sparkles } from "lucide-react";
import { TEMPLATES, type TemplateKind } from "@/lib/templates";

export const Route = createFileRoute("/_authenticated/app/templates")({
  head: () => ({
    meta: [
      { title: "Templates — Atlas" },
      {
        name: "description",
        content:
          "Reusable Atlas templates for RAID logs, charters, status reports, resource plans, change requests, stakeholder registers, meeting agendas and lessons learned.",
      },
    ],
  }),
  component: TemplatesPage,
});

const ORDER: TemplateKind[] = [
  "project_charter",
  "raid_log",
  "stakeholder_register",
  "raci_matrix",
  "project_schedule",
  "communication_plan",
  "risk_response_plan",
  "uat_plan",
  "cutover_plan",
  "training_plan",
  "status_report",
  "benefits_tracker",
  "resource_plan",
  "change_request",
  "meeting_agenda",
  "lessons_learned",
  "handover_note",
  "closure_report",
];

function TemplatesPage() {
  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6">
        <h1 className="font-display text-3xl font-semibold tracking-tight">Templates</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Structured starting points for common project deliverables. Atlas auto-selects the right
          template inside the task submission dialog when a task matches — this page is a reference of
          what each template asks for.
        </p>
      </div>

      <div className="mb-8 flex items-start gap-3 rounded-lg border border-accent-orange/30 bg-accent-orange/5 p-4 text-sm">
        <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-accent-orange" />
        <div>
          <div className="font-medium text-foreground">How templates work</div>
          <p className="mt-1 text-muted-foreground">
            Open any task in <Link to="/app/tasks" className="text-primary underline">Tasks</Link>{" "}
            and click <em>Submit</em>. If Atlas detects a matching template it appears automatically
            with a live readiness meter and an AI contextual review.
          </p>
        </div>
      </div>

      <Link
        to="/app/gantt"
        className="group mb-6 flex items-start gap-3 rounded-lg border border-primary/30 bg-primary/5 p-4 transition hover:border-primary/60 hover:bg-primary/10"
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary">
          <BarChart3 className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-display text-base font-semibold group-hover:text-primary">
            Gantt Chart <span className="ml-2 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] uppercase tracking-wider text-primary">New</span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Visualise your Project Schedule as a timeline — phases as bars, milestones as diamonds.
            Reads directly from your submitted schedule; nothing extra to fill in.
          </p>
        </div>
      </Link>

      <div className="grid gap-4 sm:grid-cols-2">
        {ORDER.map((kind) => {
          const t = TEMPLATES[kind];
          const required = t.fields.filter((f) => f.required).length;
          // RAID and Charter have their own dedicated modules; every other
          // template opens the in-app fill form.
          const to =
            kind === "raid_log"
              ? "/app/raid"
              : kind === "project_charter"
                ? "/app/charter"
                : `/app/template/${kind}`;
          return (
            <Link
              key={kind}
              to={to as any}
              className="group flex flex-col rounded-lg border border-border bg-card p-4 transition hover:border-primary/50 hover:shadow-md"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-accent-orange/10 text-accent-orange">
                  <FileText className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-display text-base font-semibold group-hover:text-primary">
                    {t.label}
                  </div>
                  <div className="mt-0.5 text-[11px] uppercase tracking-wider text-muted-foreground">
                    {t.fields.length} fields · {required} required
                  </div>
                </div>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{t.intro}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {t.fields.slice(0, 5).map((f) => (
                  <span
                    key={f.key}
                    className="rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[10px] text-muted-foreground"
                  >
                    {f.label}
                  </span>
                ))}
                {t.fields.length > 5 && (
                  <span className="rounded-full px-2 py-0.5 text-[10px] text-muted-foreground">
                    +{t.fields.length - 5} more
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}