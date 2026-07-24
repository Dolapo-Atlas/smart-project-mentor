import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { toast } from "sonner";
import jsPDF from "jspdf";
import {
  FileText,
  Save,
  Send,
  Download,
  History,
  Eye,
  Pencil,
  CheckCircle2,
  Loader2,
  AlertTriangle,
  Target,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  getOrCreateCharter,
  saveCharterDraft,
  submitCharter,
  listCharterVersions,
} from "@/lib/charter.functions";
import { TEMPLATES, evaluateCharter } from "@/lib/templates";
import { getOverview } from "@/lib/sim.functions";
import { getTaskById } from "@/lib/tasks.functions";
import { TaskContextPanel } from "@/components/mentor/task-context-panel";
import { WhyThisMatters } from "@/components/why-this-matters";

const searchSchema = z.object({
  task: z.string().uuid().optional(),
});

export const Route = createFileRoute("/_authenticated/app/charter")({
  validateSearch: searchSchema,
  component: CharterPage,
});

const STATUS_STYLES: Record<string, string> = {
  pending: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  approved: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  changes_requested: "border-orange-500/40 bg-orange-500/10 text-orange-700 dark:text-orange-300",
};

/**
 * Given a linked task's title + description, return which charter field keys
 * are most relevant. Users routed from a task shouldn't feel they must fill
 * all 10 fields — most tasks touch only 2–4.
 */
function inferFocusFields(taskText: string): string[] {
  const s = taskText.toLowerCase();
  const picks = new Set<string>();
  const add = (...keys: string[]) => keys.forEach((k) => picks.add(k));

  if (/\bscope|in[- ]scope|out of scope|vendor|technical spec|sow|requirement/.test(s))
    add("scope_in", "scope_out", "success_criteria");
  if (/objective|goal|outcome|success|kpi|measure/.test(s))
    add("objectives", "success_criteria");
  if (/purpose|why|business case|rationale|justif/.test(s))
    add("purpose", "objectives");
  if (/risk|threat|issue|assumption/.test(s)) add("initial_risks");
  if (/milestone|timeline|schedule|date|deadline/.test(s)) add("milestones");
  if (/stakeholder|sponsor|raci|owner/.test(s))
    add("key_stakeholders", "sponsor");
  if (/charter|kick[- ]off|initiate|initiation/.test(s))
    add("purpose", "objectives", "success_criteria");

  // Sensible default if nothing matched — the core three every charter needs.
  if (picks.size === 0) add("purpose", "objectives", "success_criteria");
  // Always include title so the doc has a name.
  picks.add("title");
  return Array.from(picks);
}

function CharterPage() {
  const qc = useQueryClient();
  const search = useSearch({ from: "/_authenticated/app/charter" });

  const getOrCreate = useServerFn(getOrCreateCharter);
  const saveFn = useServerFn(saveCharterDraft);
  const submitFn = useServerFn(submitCharter);
  const versionsFn = useServerFn(listCharterVersions);
  const overviewFn = useServerFn(getOverview);
  const fetchTask = useServerFn(getTaskById);

  const charterQuery = useQuery({
    queryKey: ["charter", search.task ?? null],
    queryFn: () => getOrCreate({ data: { task_id: search.task } }),
  });
  const versionsQuery = useQuery({
    queryKey: ["charter-versions"],
    queryFn: () => versionsFn(),
  });
  const overviewQuery = useQuery({
    queryKey: ["overview"],
    queryFn: () => overviewFn(),
  });
  const taskQuery = useQuery({
    queryKey: ["task-by-id", search.task ?? null],
    queryFn: () => fetchTask({ data: { id: search.task! } }),
    enabled: !!search.task,
  });

  const template = TEMPLATES.project_charter;
  const [values, setValues] = useState<Record<string, string>>({});
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [dirty, setDirty] = useState(false);
  const [showAllFields, setShowAllFields] = useState(false);

  const focusKeys = useMemo(() => {
    const t = taskQuery.data as any;
    if (!search.task || !t) return null;
    return inferFocusFields(`${t.title ?? ""} ${t.description ?? ""}`);
  }, [search.task, taskQuery.data]);
  const focusSet = useMemo(
    () => (focusKeys ? new Set(focusKeys) : null),
    [focusKeys],
  );
  // Fields the user must fill for THIS task; exclude "title" from the visible
 // count so the "3 fields" number matches what actually feels like work.
  const focusCountLabel = focusKeys
    ? Math.max(1, focusKeys.filter((k) => k !== "title").length)
    : 0;

  useEffect(() => {
    if (charterQuery.data) {
      setValues((charterQuery.data.payload as Record<string, string>) ?? {});
      setDirty(false);
    }
  }, [charterQuery.data?.id]);

  const projectCtx = useMemo(
    () => ({
      projectName: (overviewQuery.data as any)?.state?.project_name ?? null,
      stakeholders: [] as string[],
    }),
    [overviewQuery.data],
  );

  const readiness = useMemo(() => evaluateCharter(values, projectCtx), [values, projectCtx]);
  const completionPct = useMemo(() => {
    const spec = template.fields;
    const total = spec.reduce((s, f) => s + (f.required ? 2 : 1), 0);
    let earned = 0;
    for (const f of spec) {
      const v = (values[f.key] ?? "").trim();
      const min = f.minChars ?? 0;
      const ok = v.length >= min && (!f.required || v.length > 0);
      if (ok) earned += f.required ? 2 : 1;
    }
    return Math.round((earned / total) * 100);
  }, [values, template.fields]);

  const saveMutation = useMutation({
    mutationFn: () =>
      saveFn({ data: { id: charterQuery.data!.id, payload: values } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["charter"] });
      setDirty(false);
      toast.success("Draft saved.");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Save failed"),
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (dirty) {
        await saveFn({ data: { id: charterQuery.data!.id, payload: values } });
      }
      return submitFn({ data: { id: charterQuery.data!.id } });
    },
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["charter"] });
      qc.invalidateQueries({ queryKey: ["charter-versions"] });
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["inbox"] });
      qc.invalidateQueries({ queryKey: ["overview"] });
      qc.invalidateQueries({ queryKey: ["phase-progress"] });
      setDirty(false);
      toast.success(`Charter v${r.version} submitted to sponsor for approval.`);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Submit failed"),
  });

  function setField(key: string, v: string) {
    setValues((prev) => ({ ...prev, [key]: v }));
    setDirty(true);
  }

  function exportPdf() {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const margin = 48;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const maxWidth = pageWidth - margin * 2;
    let y = margin;

    const title = (values.title || "Project Charter").trim();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text(title, margin, y);
    y += 26;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(90);
    doc.text(
      `Version ${charterQuery.data?.version ?? 1} · ${completionPct}% complete · Exported ${new Date().toLocaleDateString()}`,
      margin,
      y,
    );
    y += 20;
    doc.setTextColor(20);

    for (const f of template.fields) {
      const v = (values[f.key] ?? "").trim();
      if (!v) continue;
      if (y > pageHeight - margin - 60) {
        doc.addPage();
        y = margin;
      }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text(f.label, margin, y);
      y += 16;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      const lines = doc.splitTextToSize(v, maxWidth) as string[];
      for (const line of lines) {
        if (y > pageHeight - margin) {
          doc.addPage();
          y = margin;
        }
        doc.text(line, margin, y);
        y += 13;
      }
      y += 8;
    }

    const safeName = title.replace(/[^\w\-]+/g, "-").slice(0, 60) || "project-charter";
    doc.save(`${safeName}-v${charterQuery.data?.version ?? 1}.pdf`);
  }

  if (charterQuery.isLoading || !charterQuery.data) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading charter…
      </div>
    );
  }

  const charter = charterQuery.data;
  const approvalStyle = STATUS_STYLES[charter.approval_status] ?? STATUS_STYLES.pending;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Initiation</div>
            <h1 className="font-display text-4xl font-medium flex items-center gap-3">
              <FileText className="h-8 w-8 text-accent-orange" /> Project Charter
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {template.intro}
            </p>
            {search.task && (
              <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-accent-orange/40 bg-accent-orange/10 px-2.5 py-1 text-[11px] text-accent-orange">
                <CheckCircle2 className="h-3 w-3" /> Linked to task — submitting here closes the task.
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={mode === "edit" ? "default" : "outline"}
              size="sm"
              onClick={() => setMode("edit")}
            >
              <Pencil className="mr-2 h-3.5 w-3.5" /> Edit
            </Button>
            <Button
              variant={mode === "preview" ? "default" : "outline"}
              size="sm"
              onClick={() => setMode("preview")}
            >
              <Eye className="mr-2 h-3.5 w-3.5" /> Preview
            </Button>
            <Button variant="outline" size="sm" onClick={exportPdf}>
              <Download className="mr-2 h-3.5 w-3.5" /> Export PDF
            </Button>
          </div>
        </header>

        <TaskContextPanel taskId={search.task} />

        <WhyThisMatters
          storageKey="charter"
          title="Why you're writing a Charter"
          body={
            <>
              <p>
                The Charter is the one-page contract between you and your sponsor. It answers four
                questions before the project starts spending money: <em>Why are we doing this?
                What does "done" look like? Who owns it? What could go wrong?</em>
              </p>
              <p>
                Without an approved Charter, scope drifts, risks arrive as surprises, and nobody
                agrees on what success means. It doesn't need to be long — it needs to be specific
                to <em>this</em> project, not a template you copied.
              </p>
            </>
          }
          tip="Fill in the fields in order. Each one builds on the last."
        />

        {mode === "edit" ? (
          (() => {
            const focused = focusSet
              ? template.fields.filter((f) => focusSet.has(f.key))
              : template.fields;
            const rest = focusSet
              ? template.fields.filter((f) => !focusSet.has(f.key))
              : [];
            const renderField = (f: (typeof template.fields)[number]) => (
              <div
                key={f.key}
                className={`rounded-lg border p-4 ${
                  focusSet && focusSet.has(f.key)
                    ? "border-accent-orange/40 bg-accent-orange/5"
                    : "border-border bg-card"
                }`}
              >
                <label className="text-sm font-semibold text-foreground">
                  {f.label}
                  {f.required && <span className="ml-1 text-destructive">*</span>}
                </label>
                {f.guidance && (
                  <div className="mt-0.5 text-xs text-muted-foreground">{f.guidance}</div>
                )}
                {f.kind === "textarea" ? (
                  <Textarea
                    className="mt-2"
                    rows={4}
                    placeholder={f.placeholder}
                    value={values[f.key] ?? ""}
                    onChange={(e) => setField(f.key, e.target.value)}
                  />
                ) : (
                  <Input
                    className="mt-2"
                    placeholder={f.placeholder}
                    value={values[f.key] ?? ""}
                    onChange={(e) => setField(f.key, e.target.value)}
                  />
                )}
                {f.minChars ? (
                  <div className="mt-1 text-[11px] text-muted-foreground">
                    {(values[f.key] ?? "").trim().length} / {f.minChars} chars
                  </div>
                ) : null}
              </div>
            );
            return (
              <div className="space-y-4">
                {focusSet && (
                  <div className="rounded-lg border border-accent-orange/40 bg-accent-orange/10 p-3 text-sm">
                    <div className="flex items-start gap-2">
                      <Target className="mt-0.5 h-4 w-4 shrink-0 text-accent-orange" />
                      <div>
                        <div className="font-semibold text-foreground">
                          For this task, focus on {focusCountLabel} {focusCountLabel === 1 ? "field" : "fields"}
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          The Charter has 10 sections total, but you don't need to fill them all today.
                          The highlighted fields below are what this task is really asking for. You can
                          revisit the rest later — the Charter is a living document.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                {focused.map(renderField)}
                {focusSet && rest.length > 0 && (
                  <div className="rounded-lg border border-dashed border-border">
                    <button
                      type="button"
                      onClick={() => setShowAllFields((v) => !v)}
                      className="flex w-full items-center justify-between px-4 py-3 text-sm text-muted-foreground hover:text-foreground"
                    >
                      <span>
                        {showAllFields ? "Hide" : "Show"} the other {rest.length} charter fields
                        <span className="ml-1 text-xs opacity-70">(optional for this task)</span>
                      </span>
                      {showAllFields ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </button>
                    {showAllFields && (
                      <div className="space-y-4 border-t border-border/60 p-4">
                        {rest.map(renderField)}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })()
        ) : (
          <div className="space-y-4 rounded-lg border border-border bg-card p-6">
            <h2 className="font-display text-2xl">{values.title || "(Untitled charter)"}</h2>
            {template.fields.filter((f) => f.key !== "title").map((f) => {
              const v = (values[f.key] ?? "").trim();
              return (
                <div key={f.key}>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">
                    {f.label}
                  </div>
                  {v ? (
                    <div className="mt-1 whitespace-pre-wrap text-sm">{v}</div>
                  ) : (
                    <div className="mt-1 text-sm italic text-muted-foreground">(not filled in)</div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <aside className="space-y-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Charter completion
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <div className="text-3xl font-semibold tabular-nums">{completionPct}%</div>
            <div className="text-xs text-muted-foreground">based on required sections</div>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-accent-orange transition-all"
              style={{ width: `${completionPct}%` }}
            />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => saveMutation.mutate()}
              disabled={!dirty || saveMutation.isPending}
            >
              <Save className="mr-2 h-3.5 w-3.5" /> Save draft
            </Button>
            <Button
              size="sm"
              onClick={() => submitMutation.mutate()}
              disabled={submitMutation.isPending || completionPct < 40}
            >
              <Send className="mr-2 h-3.5 w-3.5" /> Submit for approval
            </Button>
          </div>
          {completionPct < 40 && (
            <div className="mt-2 flex items-start gap-1 text-[11px] text-amber-700 dark:text-amber-300">
              <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" /> At least 40% complete before submit.
            </div>
          )}
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Sponsor approval
          </div>
          <div className={`mt-2 inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] capitalize ${approvalStyle}`}>
            {charter.approval_status.replace("_", " ")}
          </div>
          {charter.submitted_at && (
            <div className="mt-2 text-[11px] text-muted-foreground">
              Submitted {new Date(charter.submitted_at).toLocaleString()}
            </div>
          )}
          {charter.sponsor_comment && (
            <div className="mt-2 rounded-md bg-muted/40 p-2 text-xs italic">
              "{charter.sponsor_comment}"
            </div>
          )}
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <History className="h-3 w-3" /> Version history
            </div>
            <div className="text-[11px] text-muted-foreground">v{charter.version}</div>
          </div>
          <ul className="mt-2 space-y-1 text-xs">
            {(versionsQuery.data ?? []).length === 0 && (
              <li className="text-muted-foreground italic">No submissions yet.</li>
            )}
            {(versionsQuery.data ?? []).map((v: any) => (
              <li key={v.id} className="flex items-center justify-between rounded-md border border-border/50 px-2 py-1">
                <span>v{v.version} · {v.completion_pct}%</span>
                <span className="text-muted-foreground">
                  {new Date(v.submitted_at).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-lg border border-border bg-muted/30 p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Readiness signal
          </div>
          <div className="mt-1 text-2xl font-semibold tabular-nums">{readiness.score}<span className="text-sm opacity-70">/100</span></div>
          <ul className="mt-2 space-y-1 text-[11px]">
            {readiness.checks.slice(0, 6).map((c, i) => (
              <li key={i} className={c.ok ? "text-emerald-700 dark:text-emerald-300" : "text-muted-foreground"}>
                {c.ok ? "✓ " : "○ "}{c.label}
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  );
}