import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { toast } from "sonner";
import jsPDF from "jspdf";
import {
  Sparkles,
  Save,
  Send,
  Download,
  History,
  Eye,
  Pencil,
  CheckCircle2,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  getOrCreateLessons,
  saveLessonsDraft,
  submitLessons,
  listLessonsVersions,
} from "@/lib/lessons.functions";
import { TEMPLATES, evaluateGenericTemplate } from "@/lib/templates";
import { getOverview } from "@/lib/sim.functions";
import { WhyThisMatters } from "@/components/why-this-matters";

const searchSchema = z.object({
  task: z.string().uuid().optional(),
});

export const Route = createFileRoute("/_authenticated/app/lessons")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Lessons Learned — Atlas" },
      {
        name: "description",
        content:
          "Honest project retrospective — capture what worked, what didn't, and the actions the next project will inherit.",
      },
    ],
  }),
  component: LessonsPage,
});

const STATUS_STYLES: Record<string, string> = {
  pending: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  approved: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  changes_requested: "border-orange-500/40 bg-orange-500/10 text-orange-700 dark:text-orange-300",
};

function LessonsPage() {
  const qc = useQueryClient();
  const search = useSearch({ from: "/_authenticated/app/lessons" });

  const getOrCreate = useServerFn(getOrCreateLessons);
  const saveFn = useServerFn(saveLessonsDraft);
  const submitFn = useServerFn(submitLessons);
  const versionsFn = useServerFn(listLessonsVersions);
  const overviewFn = useServerFn(getOverview);

  const docQuery = useQuery({
    queryKey: ["lessons", search.task ?? null],
    queryFn: () => getOrCreate({ data: { task_id: search.task } }),
  });
  const versionsQuery = useQuery({
    queryKey: ["lessons-versions"],
    queryFn: () => versionsFn(),
  });
  const overviewQuery = useQuery({
    queryKey: ["overview"],
    queryFn: () => overviewFn(),
  });

  const template = TEMPLATES.lessons_learned;
  const [values, setValues] = useState<Record<string, string>>({});
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (docQuery.data) {
      setValues((docQuery.data.payload as Record<string, string>) ?? {});
      setDirty(false);
    }
  }, [docQuery.data?.id]);

  const projectCtx = useMemo(
    () => ({
      projectName: (overviewQuery.data as any)?.state?.project_name ?? null,
      stakeholders: [] as string[],
    }),
    [overviewQuery.data],
  );

  const readiness = useMemo(
    () => evaluateGenericTemplate("lessons_learned", values, projectCtx),
    [values, projectCtx],
  );
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
    mutationFn: () => saveFn({ data: { id: docQuery.data!.id, payload: values } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lessons"] });
      setDirty(false);
      toast.success("Draft saved.");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Save failed"),
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (dirty) {
        await saveFn({ data: { id: docQuery.data!.id, payload: values } });
      }
      return submitFn({ data: { id: docQuery.data!.id } });
    },
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["lessons"] });
      qc.invalidateQueries({ queryKey: ["lessons-versions"] });
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["inbox"] });
      qc.invalidateQueries({ queryKey: ["overview"] });
      qc.invalidateQueries({ queryKey: ["phase-progress"] });
      setDirty(false);
      toast.success(`Lessons Learned v${r.version} submitted to sponsor.`);
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

    const title = "Lessons Learned";
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text(title, margin, y);
    y += 26;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(90);
    doc.text(
      `Version ${docQuery.data?.version ?? 1} · ${completionPct}% complete · Exported ${new Date().toLocaleDateString()}`,
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

    doc.save(`lessons-learned-v${docQuery.data?.version ?? 1}.pdf`);
  }

  if (docQuery.isLoading || !docQuery.data) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading retrospective…
      </div>
    );
  }

  const doc = docQuery.data;
  const approvalStyle = STATUS_STYLES[doc.approval_status] ?? STATUS_STYLES.pending;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Closure</div>
            <h1 className="font-display text-4xl font-medium flex items-center gap-3">
              <Sparkles className="h-8 w-8 text-accent-orange" /> Lessons Learned
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{template.intro}</p>
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

        <WhyThisMatters
          storageKey="lessons"
          title="Why you're writing Lessons Learned"
          body={
            <>
              <p>
                Lessons Learned aren't a retro ritual — they're the debt your next
                project inherits, for better or worse. The team after yours will hit
                the same rocks unless you name them, honestly, with root causes and
                concrete actions.
              </p>
              <p>
                The rule: no blame, no vague platitudes ("we should communicate
                better"). Describe the pattern, ask why twice, and leave an action
                with an owner and a date. That's what a real retro delivers.
              </p>
            </>
          }
          tip="Actions without an owner and a date will not land. Assign both, always."
        />

        {mode === "edit" ? (
          <div className="space-y-4">
            {template.fields.map((f) => (
              <div key={f.key} className="rounded-lg border border-border bg-card p-4">
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
            ))}
          </div>
        ) : (
          <div className="space-y-4 rounded-lg border border-border bg-card p-6">
            <h2 className="font-display text-2xl">Lessons Learned</h2>
            {template.fields.map((f) => {
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
            Retro completion
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
              <Send className="mr-2 h-3.5 w-3.5" /> Submit retro
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
            Sponsor acknowledgement
          </div>
          <div className={`mt-2 inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] capitalize ${approvalStyle}`}>
            {doc.approval_status.replace("_", " ")}
          </div>
          {doc.submitted_at && (
            <div className="mt-2 text-[11px] text-muted-foreground">
              Submitted {new Date(doc.submitted_at).toLocaleString()}
            </div>
          )}
          {doc.sponsor_comment && (
            <div className="mt-2 rounded-md bg-muted/40 p-2 text-xs italic">
              "{doc.sponsor_comment}"
            </div>
          )}
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <History className="h-3 w-3" /> Version history
            </div>
            <div className="text-[11px] text-muted-foreground">v{doc.version}</div>
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
          <div className="mt-1 text-2xl font-semibold tabular-nums">
            {readiness.score}<span className="text-sm opacity-70">/100</span>
          </div>
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