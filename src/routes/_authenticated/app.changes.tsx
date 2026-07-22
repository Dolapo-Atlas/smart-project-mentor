import { createFileRoute, useSearch, useNavigate } from "@tanstack/react-router";
import { TaskContextPanel } from "@/components/mentor/task-context-panel";
import { WhyThisMatters } from "@/components/why-this-matters";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listChangeRequests,
  generateChangeRequest,
  decideChangeRequest,
  createChangeRequest,
} from "@/lib/pm.functions";
import { listTasksRich, submitTaskWithWork } from "@/lib/tasks.functions";
import { TaskSubmissionDialog } from "@/components/tasks/task-submission-dialog";
import { encodeSubmission, evaluateGenericTemplate, TEMPLATES } from "@/lib/templates";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Check, X, Download, FilePlus2, Send, GitPullRequestArrow } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import jsPDF from "jspdf";
import { StakeholderSelect } from "@/components/stakeholder-select";

const changesSearchSchema = z.object({
  task: z.string().uuid().optional(),
  create: z.coerce.boolean().optional(),
  prefill_title: z.string().optional(),
  cr: z.string().uuid().optional(),
});

export const Route = createFileRoute("/_authenticated/app/changes")({
  validateSearch: changesSearchSchema,
  component: Changes,
});

const riskStyle: Record<string, string> = {
  low: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  medium: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  high: "bg-red-500/10 text-red-700 dark:text-red-400",
};
const statusStyle: Record<string, string> = {
  submitted: "bg-blue-500/10 text-blue-700",
  approved: "bg-emerald-500/10 text-emerald-700",
  rejected: "bg-red-500/10 text-red-700",
  draft: "bg-muted text-muted-foreground",
};

function fmt(n: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(n);
}

function Changes() {
  const qc = useQueryClient();
  const search = useSearch({ from: "/_authenticated/app/changes" });
  const navigate = useNavigate();
  const fetchCRs = useServerFn(listChangeRequests);
  const genFn = useServerFn(generateChangeRequest);
  const decideFn = useServerFn(decideChangeRequest);
  const createFn = useServerFn(createChangeRequest);
  const fetchTasks = useServerFn(listTasksRich);
  const submitFn = useServerFn(submitTaskWithWork);
  const { data: crs } = useQuery({ queryKey: ["change_requests"], queryFn: () => fetchCRs() });
  const { data: tasks } = useQuery({ queryKey: ["tasks"], queryFn: () => fetchTasks() });
  const linkedTask = useMemo(
    () => (search.task ? (tasks ?? []).find((t: any) => t.id === search.task) : undefined),
    [tasks, search.task],
  );
  const authorMode = Boolean(search.create || search.task);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = crs?.find((c) => c.id === selectedId) ?? crs?.[0];

  const [assessment, setAssessment] = useState("");
  const [notes, setNotes] = useState("");

  // Authoring form state
  const [aTitle, setATitle] = useState(search.prefill_title ?? "");
  const [aRequester, setARequester] = useState("");
  const [aDescription, setADescription] = useState("");
  const [aCost, setACost] = useState<string>("0");
  const [aDays, setADays] = useState<string>("0");
  const [aRisk, setARisk] = useState<"low" | "medium" | "high">("medium");
  const [aOptions, setAOptions] = useState("");
  const [aRecommendation, setARecommendation] = useState("");
  const [aImpact, setAImpact] = useState("");
  const [aDecisionBy, setADecisionBy] = useState("");
  const [submitOpen, setSubmitOpen] = useState(false);
  const [lastCreatedId, setLastCreatedId] = useState<string | null>(null);

  useEffect(() => {
    if (search.prefill_title && !aTitle) setATitle(search.prefill_title);
  }, [search.prefill_title]);

  const gen = useMutation({
    mutationFn: () => genFn(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["change_requests"] });
      toast.success("A new change request just landed.");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const decide = useMutation({
    mutationFn: (v: { decision: "approved" | "rejected" }) => decideFn({ data: { id: selected!.id, decision: v.decision, impact_assessment: assessment, decision_notes: notes || undefined } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["change_requests"] });
      qc.invalidateQueries({ queryKey: ["inbox"] });
      qc.invalidateQueries({ queryKey: ["budget"] });
      setAssessment(""); setNotes("");
      toast.success("Decision saved.");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const create = useMutation({
    mutationFn: () =>
      createFn({
        data: {
          title: aTitle,
          description: aDescription,
          requested_by: aRequester,
          cost_impact: Number(aCost) || 0,
          schedule_impact_days: Math.trunc(Number(aDays) || 0),
          risk_impact: aRisk,
          impact_assessment: aImpact,
          linked_task_id: search.task ?? undefined,
        },
      }),
    onSuccess: (row: any) => {
      qc.invalidateQueries({ queryKey: ["change_requests"] });
      qc.invalidateQueries({ queryKey: ["inbox"] });
      qc.invalidateQueries({ queryKey: ["tasks"] });
      setLastCreatedId(row?.id ?? null);
      toast.success("Change request sent to the change board.");
      if (linkedTask) {
        setSubmitOpen(true);
      } else {
        // reset
        setATitle(""); setADescription(""); setARequester("");
        setACost("0"); setADays("0"); setAOptions(""); setARecommendation(""); setAImpact(""); setADecisionBy("");
      }
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const templateValues = useMemo(
    () => ({
      summary: aDescription,
      reason: aDescription,
      impact_scope: aImpact,
      impact_schedule: `${aDays} days`,
      impact_cost: `£${aCost}`,
      options: aOptions,
      recommendation: aRecommendation,
      requester: aRequester,
      decision_by: aDecisionBy,
    }),
    [aDescription, aImpact, aDays, aCost, aOptions, aRecommendation, aRequester, aDecisionBy],
  );

  const submitLinkedTask = useMutation({
    mutationFn: (v: { id: string; submission: string }) => submitFn({ data: v }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["overview"] });
      qc.invalidateQueries({ queryKey: ["whats-next"] });
      qc.invalidateQueries({ queryKey: ["phase-progress"] });
      setSubmitOpen(false);
      toast.success("Task complete — well done.");
      navigate({ to: "/app/tasks" });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const canSubmitAuthor = aTitle.length >= 3 && aRequester.length >= 2 && aDescription.length >= 10 && aImpact.length >= 10;

  function exportPdf(cr: any) {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const margin = 48;
    let y = margin;
    doc.setFont("times", "bold"); doc.setFontSize(18);
    doc.text(`Change Request — ${cr.title}`, margin, y); y += 24;
    doc.setFont("times", "normal"); doc.setFontSize(10);
    doc.text(`Requested by: ${cr.requested_by}  ·  Status: ${cr.status}  ·  Origin: ${cr.origin ?? "received"}`, margin, y); y += 18;
    doc.text(`Cost impact: £${Number(cr.cost_impact).toLocaleString()}   Schedule: ${cr.schedule_impact_days >= 0 ? "+" : ""}${cr.schedule_impact_days} days   Risk: ${cr.risk_impact}`, margin, y); y += 22;
    const write = (label: string, body: string | null | undefined) => {
      if (!body) return;
      doc.setFont("times", "bold"); doc.setFontSize(12); doc.text(label, margin, y); y += 16;
      doc.setFont("times", "normal"); doc.setFontSize(11);
      const lines = doc.splitTextToSize(body, 500);
      lines.forEach((ln: string) => { if (y > 780) { doc.addPage(); y = margin; } doc.text(ln, margin, y); y += 14; });
      y += 6;
    };
    write("Description", cr.description);
    write("Impact assessment", cr.impact_assessment);
    write("Decision notes", cr.decision_notes);
    doc.save(`change-request-${cr.id.slice(0, 8)}.pdf`);
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Governance</div>
          <h1 className="font-display text-4xl font-medium">Change requests</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Author a change request when a task requires one, or review CRs raised by stakeholders. Approved CRs post to the budget automatically.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate({ to: "/app/changes", search: { create: true } })}>
            <FilePlus2 className="mr-2 h-4 w-4" /> Author a CR
          </Button>
          <Button onClick={() => gen.mutate()} disabled={gen.isPending}>
            <Sparkles className="mr-2 h-4 w-4" /> {gen.isPending ? "Drafting…" : "Receive a new CR"}
          </Button>
        </div>
      </header>

      <TaskContextPanel taskId={search.task} />

      <WhyThisMatters
        storageKey="changes"
        title="Why Change Requests exist"
        body={
          <>
            <p>
              Every project gets asked to "just add one small thing." A CR is how you
              protect the plan: it forces the requester to name the trigger, quantify
              the impact on scope, schedule and cost, and consider at least two options
              before the change board decides.
            </p>
            <p>
              Silent scope creep is what sinks projects. A CR turns an argument in a
              corridor into a documented decision — good news for the sponsor, and
              good cover for you when the timeline slips because they said yes.
            </p>
          </>
        }
        tip="Never submit a CR with only one option. Change boards reject single-option asks on principle."
      />

      {authorMode && (
        <section className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Author</div>
              <h2 className="font-display text-2xl font-medium">Draft a change request</h2>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                {linkedTask
                  ? <>Linked to task <span className="font-medium">{linkedTask.title}</span>. Submitting will file the CR and complete the task.</>
                  : "Fill every section. The change board rejects vague asks with no options or quantified impact."}
              </p>
            </div>
            <Button variant="ghost" onClick={() => navigate({ to: "/app/changes", search: {} })}>Close</Button>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <Field label="CR title">
              <Input value={aTitle} onChange={(e) => setATitle(e.target.value)} placeholder="e.g. Add vendor integration to Phase 2" />
            </Field>
            <Field label="Requested by">
              <StakeholderSelect
                value={aRequester}
                onChange={(name) => setARequester(name)}
                emptyLabel="Choose a stakeholder"
                suggestedRoles={["sponsor", "care_home", "clinical", "vendor"]}
              />
            </Field>
            <Field label="Cost impact (£)">
              <Input type="number" value={aCost} onChange={(e) => setACost(e.target.value)} placeholder="0" />
            </Field>
            <Field label="Schedule impact (days)">
              <Input type="number" value={aDays} onChange={(e) => setADays(e.target.value)} placeholder="0" />
            </Field>
            <Field label="Risk impact">
              <Select value={aRisk} onValueChange={(v) => setARisk(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Decision needed by">
              <Input value={aDecisionBy} onChange={(e) => setADecisionBy(e.target.value)} placeholder="e.g. 24 Oct — before sprint planning" />
            </Field>
          </div>
          <div className="mt-4 grid gap-4">
            <Field label="Change summary & reason">
              <Textarea value={aDescription} onChange={(e) => setADescription(e.target.value)} placeholder="What is changing, why now, and what triggered it?" className="min-h-[100px]" />
            </Field>
            <Field label="Options considered (min. two, with pros/cons)">
              <Textarea value={aOptions} onChange={(e) => setAOptions(e.target.value)} placeholder="Option A — … / Option B — …" className="min-h-[90px]" />
            </Field>
            <Field label="Recommendation">
              <Textarea value={aRecommendation} onChange={(e) => setARecommendation(e.target.value)} placeholder="Which option and why." className="min-h-[70px]" />
            </Field>
            <Field label="Impact assessment (scope / schedule / cost / risk / stakeholders)">
              <Textarea value={aImpact} onChange={(e) => setAImpact(e.target.value)} placeholder="Be specific — this is what the change board evaluates." className="min-h-[110px]" />
            </Field>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
            <Button
              onClick={() => create.mutate()}
              disabled={!canSubmitAuthor || create.isPending}
            >
              <Send className="mr-2 h-4 w-4" /> {create.isPending ? "Submitting…" : linkedTask ? "Submit CR & close task" : "Submit CR to change board"}
            </Button>
          </div>
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <ul className="space-y-2">
          {(crs ?? []).length === 0 && (
            <li>
              <EmptyState
                icon={GitPullRequestArrow}
                title="No change requests."
                body="Enjoy the calm — it rarely lasts. When scope shifts, this is where you'll capture it."
              />
            </li>
          )}
          {crs?.map((c) => {
            const active = selected?.id === c.id;
            return (
              <li key={c.id}>
                <button
                  onClick={() => setSelectedId(c.id)}
                  className={`w-full rounded-md border p-4 text-left ${active ? "border-foreground bg-card" : "border-border bg-card/60 hover:bg-card"}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-semibold">{c.title}</span>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider ${statusStyle[c.status]}`}>{c.status}</span>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    From {c.requested_by}
                    {(c as any).origin === "authored" && <span className="ml-1 rounded bg-muted px-1 text-[10px] uppercase tracking-wider">you</span>}
                  </div>
                  <div className="mt-1 flex items-center justify-between text-xs">
                    <span className={Number(c.cost_impact) < 0 ? "text-emerald-700" : "text-foreground"}>{fmt(Number(c.cost_impact))}</span>
                    <span className="text-muted-foreground">{c.schedule_impact_days >= 0 ? "+" : ""}{c.schedule_impact_days}d</span>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>

        <article className="min-h-[400px] rounded-lg border border-border bg-card p-6">
          {selected ? (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    From {selected.requested_by} · {formatDistanceToNow(new Date(selected.created_at), { addSuffix: true })}
                  </div>
                  <h2 className="mt-1 font-display text-2xl font-medium">{selected.title}</h2>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => exportPdf(selected)}>
                    <Download className="mr-2 h-4 w-4" /> PDF
                  </Button>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider ${statusStyle[selected.status]}`}>{selected.status}</span>
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <Cell label="Cost impact" value={fmt(Number(selected.cost_impact))} tone={Number(selected.cost_impact) < 0 ? "text-emerald-700" : Number(selected.cost_impact) > 0 ? "text-destructive" : ""} />
                <Cell label="Schedule" value={`${selected.schedule_impact_days >= 0 ? "+" : ""}${selected.schedule_impact_days} days`} />
                <div className="rounded-md border border-border bg-background p-3">
                  <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Risk</div>
                  <div className="mt-1">
                    <span className={`rounded px-2 py-0.5 text-xs uppercase tracking-wider ${riskStyle[selected.risk_impact]}`}>{selected.risk_impact}</span>
                  </div>
                </div>
              </div>

              <div className="mt-5">
                <div className="text-xs uppercase tracking-widest text-muted-foreground">Description</div>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">{selected.description}</p>
              </div>

              {selected.status === "submitted" ? (
                (selected as any).origin === "authored" ? (
                  <div className="mt-6 rounded-md border border-border bg-background p-4 text-sm text-muted-foreground">
                    Awaiting the change board's decision. Sponsor confirmation is in your inbox.
                  </div>
                ) : (
                <div className="mt-6 space-y-3 rounded-md border border-border bg-background p-4">
                  <div>
                    <div className="mb-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Your impact assessment</div>
                    <Textarea
                      placeholder="Assess the impact on scope, schedule, budget, risk, and stakeholders. Be specific — this goes to the change board."
                      value={assessment}
                      onChange={(e) => setAssessment(e.target.value)}
                      className="min-h-[100px]"
                    />
                  </div>
                  <div>
                    <div className="mb-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Decision notes (optional)</div>
                    <Textarea
                      placeholder="Rationale for the decision."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => decide.mutate({ decision: "rejected" })} disabled={assessment.length < 10 || decide.isPending}>
                      <X className="mr-2 h-4 w-4" /> Reject
                    </Button>
                    <Button onClick={() => decide.mutate({ decision: "approved" })} disabled={assessment.length < 10 || decide.isPending}>
                      <Check className="mr-2 h-4 w-4" /> Approve
                    </Button>
                  </div>
                </div>
                )
              ) : (
                <div className="mt-6 space-y-3 rounded-md border border-border bg-background p-4 text-sm">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Impact assessment</div>
                    <p className="mt-1 whitespace-pre-wrap">{selected.impact_assessment ?? "—"}</p>
                  </div>
                  {selected.decision_notes && (
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Decision notes</div>
                      <p className="mt-1 whitespace-pre-wrap">{selected.decision_notes}</p>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">Select a change request</div>
          )}
        </article>
      </div>

      <TaskSubmissionDialog
        task={linkedTask ? {
          id: linkedTask.id,
          title: linkedTask.title,
          description: linkedTask.description,
          category: linkedTask.category,
          linked_area: linkedTask.linked_area,
          completion_action: linkedTask.completion_action,
        } : null}
        open={submitOpen && !!linkedTask}
        onOpenChange={(o) => setSubmitOpen(o)}
        submitting={submitLinkedTask.isPending}
        onSubmit={(encoded) => {
          if (!linkedTask) return;
          submitLinkedTask.mutate({ id: linkedTask.id, submission: encoded });
        }}
      />

      {/* Reference: template payload derived from CR fields (used by the dialog when prefilled). */}
      <input type="hidden" data-cr-payload value={encodeSubmission({
        kind: "template",
        template: "change_request",
        values: templateValues,
        readiness: evaluateGenericTemplate("change_request", templateValues),
      })} />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">{label}</div>
      {children}
    </label>
  );
}

function Cell({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-md border border-border bg-background p-3">
      <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className={`mt-1 font-display text-lg font-medium ${tone ?? ""}`}>{value}</div>
    </div>
  );
}