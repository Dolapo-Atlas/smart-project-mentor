import { createFileRoute, useSearch, useNavigate } from "@tanstack/react-router";
import { TaskContextPanel } from "@/components/mentor/task-context-panel";
import { WhyThisMatters } from "@/components/why-this-matters";
import { ReportingPack } from "@/components/dashboard/reporting-pack";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listStatusReports, upsertStatusReport } from "@/lib/pm.functions";
import { getOverview } from "@/lib/sim.functions";
import { listTasksRich, submitTaskWithWork } from "@/lib/tasks.functions";
import { TaskSubmissionDialog } from "@/components/tasks/task-submission-dialog";
import { encodeSubmission, evaluateStatusReport } from "@/lib/templates";
import { useEffect, useMemo, useRef, useState } from "react";
import jsPDF from "jspdf";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Send, Save, Download, FileText, CheckCircle2 } from "lucide-react";

const reportsSearchSchema = z.object({
  task: z.string().uuid().optional(),
});

export const Route = createFileRoute("/_authenticated/app/reports")({
  validateSearch: reportsSearchSchema,
  component: Reports,
});

type Rag = "green" | "amber" | "red";
const ragDot: Record<Rag, string> = {
  green: "bg-emerald-500",
  amber: "bg-amber-500",
  red: "bg-red-500",
};

function mondayOf(d = new Date()) {
  const date = new Date(d);
  const day = date.getDay();
  date.setDate(date.getDate() + (day === 0 ? -6 : 1 - day));
  return date.toISOString().slice(0, 10);
}

type ReportRow = {
  id: string;
  week_start: string;
  rag_summary: string;
  achievements: string | null;
  next_week: string | null;
  risks_blockers: string | null;
  ai_score: number | null;
  ai_feedback: unknown;
  submitted_at: string | null;
};

function reportToHtml(r: ReportRow): string {
  const esc = (s: string | null | undefined) =>
    (s ?? "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c] as string));
  const nl2br = (s: string | null | undefined) => esc(s).replace(/\n/g, "<br/>");
  const fb = r.ai_feedback as FB | null;
  const ragColor: Record<string, string> = { green: "#10b981", amber: "#f59e0b", red: "#ef4444" };
  return `<!doctype html><html><head><meta charset="utf-8"/><title>Weekly Status Report — ${r.week_start}</title>
<style>
 body{font-family:Georgia,'Times New Roman',serif;color:#111;max-width:780px;margin:40px auto;padding:0 24px;line-height:1.5}
 h1{font-size:24px;margin:0 0 4px}
 h2{font-size:14px;letter-spacing:.12em;text-transform:uppercase;color:#555;margin:24px 0 8px;border-bottom:1px solid #ddd;padding-bottom:4px}
 .meta{color:#666;font-size:13px;margin-bottom:16px}
 .rag{display:inline-block;padding:2px 10px;border-radius:999px;color:#fff;font-size:12px;text-transform:uppercase;letter-spacing:.1em;background:${ragColor[r.rag_summary] || "#666"}}
 .score{display:inline-block;border:2px solid #b45309;color:#b45309;border-radius:999px;padding:4px 12px;font-weight:600;margin-left:8px}
 p{white-space:pre-wrap}
 ul{padding-left:20px}
 .feedback{background:#f8f8f6;border:1px solid #e5e5e0;padding:12px 16px;border-radius:6px;margin-top:8px}
</style></head><body>
<h1>Weekly Status Report</h1>
<div class="meta">Digital Care Records Rollout · Atlas Enterprise<br/>Week of <strong>${r.week_start}</strong> · <span class="rag">${r.rag_summary}</span>${r.ai_score != null ? `<span class="score">${r.ai_score}/100</span>` : ""}</div>
<h2>Achievements this week</h2><p>${nl2br(r.achievements) || "<em>—</em>"}</p>
<h2>Plan for next week</h2><p>${nl2br(r.next_week) || "<em>—</em>"}</p>
<h2>Risks &amp; blockers</h2><p>${nl2br(r.risks_blockers) || "<em>—</em>"}</p>
${fb ? `<h2>Sponsor feedback</h2><div class="feedback"><p><strong>${esc(fb.summary)}</strong></p>
<p><strong>Strengths</strong></p><ul>${fb.strengths.map((s) => `<li>${esc(s)}</li>`).join("")}</ul>
<p><strong>Weaknesses</strong></p><ul>${fb.weaknesses.map((s) => `<li>${esc(s)}</li>`).join("")}</ul>
<p><em>${esc(fb.sponsor_reaction)}</em> — David Okafor, Executive Sponsor</p></div>` : ""}
</body></html>`;
}

function downloadReport(r: ReportRow, format: "doc" | "pdf") {
  const html = reportToHtml(r);
  if (format === "doc") {
    const blob = new Blob(
      ["\ufeff", '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">', html, "</html>"],
      { type: "application/msword" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `status-report-${r.week_start}.doc`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast.success("Word document downloaded.");
  } else {
    const w = window.open("", "_blank");
    if (!w) {
      toast.error("Popup blocked. Allow popups to export PDF.");
      return;
    }
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 300);
  }
}

function Reports() {
  const qc = useQueryClient();
  const search = useSearch({ from: "/_authenticated/app/reports" });
  const navigate = useNavigate();
  const fetchReports = useServerFn(listStatusReports);
  const upsert = useServerFn(upsertStatusReport);
  const fetchOverview = useServerFn(getOverview);
  const fetchTasks = useServerFn(listTasksRich);
  const submitTaskFn = useServerFn(submitTaskWithWork);
  const { data: reports } = useQuery({ queryKey: ["status_reports"], queryFn: () => fetchReports() });
  const { data: overview } = useQuery({ queryKey: ["overview"], queryFn: () => fetchOverview() });
  const { data: allTasks } = useQuery({
    queryKey: ["tasks"],
    queryFn: () => fetchTasks() as Promise<any[]>,
    enabled: !!search.task,
  });
  const linkedTask = (allTasks ?? []).find((t: any) => t.id === search.task) ?? null;
  const [submitOpen, setSubmitOpen] = useState(false);

  const thisWeek = mondayOf();
  const current = reports?.find((r) => r.week_start === thisWeek);
  const suggestedRag = ((overview as any)?.state?.health as Rag | undefined) ?? "amber";

  const [rag, setRag] = useState<Rag>((current?.rag_summary as Rag) ?? suggestedRag);
  const [ach, setAch] = useState(current?.achievements ?? "");
  const [next, setNext] = useState(current?.next_week ?? "");
  const [risks, setRisks] = useState(current?.risks_blockers ?? "");
  const [decisions, setDecisions] = useState((current as any)?.decisions_needed ?? "");
  const [budgetNote, setBudgetNote] = useState((current as any)?.budget_note ?? "");

  // When live data arrives (or task-link mode swaps overview), sync RAG default
  // once, without stomping the user's manual choice on this render.
  const hydratedRef = useRef(false);
  useEffect(() => {
    if (hydratedRef.current) return;
    if (!current && overview) {
      hydratedRef.current = true;
      setRag(suggestedRag);
    } else if (current) {
      hydratedRef.current = true;
    }
  }, [current, overview, suggestedRag]);

  const save = useMutation({
    mutationFn: (submit: boolean) =>
      upsert({
        data: {
          week_start: thisWeek,
          rag_summary: rag,
          achievements: ach,
          next_week: next,
          risks_blockers: risks,
          decisions_needed: decisions || undefined,
          budget_note: budgetNote || undefined,
          submit,
        },
      }),
    onSuccess: (_d, submit) => {
      qc.invalidateQueries({ queryKey: ["status_reports"] });
      qc.invalidateQueries({ queryKey: ["inbox"] });
      qc.invalidateQueries({ queryKey: ["reporting-pack"] });
      toast.success(submit ? "Submitted to sponsor." : "Draft saved.");
      // If a task deep-linked us here, open the shared submission dialog so
      // the linked task closes through the existing feedback pipeline.
      if (submit && search.task && linkedTask) {
        setSubmitOpen(true);
      }
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const submitLinkedTask = useMutation({
    mutationFn: (v: { id: string; submission: string }) => submitTaskFn({ data: v }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["overview"] });
      qc.invalidateQueries({ queryKey: ["whats-next"] });
      qc.invalidateQueries({ queryKey: ["phase-progress"] });
      toast.success("Submitted for review");
      setSubmitOpen(false);
      navigate({ to: "/app/reports", search: {}, replace: true });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const templateValues = useMemo(() => ({
    period: `Week of ${thisWeek}`,
    rag,
    achievements: ach,
    next_week: next,
    risks_blockers: risks,
    decisions_needed: "",
    budget_note: "",
  }), [thisWeek, rag, ach, next, risks]);

  function exportPdf() {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const margin = 48;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const maxWidth = pageWidth - margin * 2;
    let y = margin;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text("Weekly Status Report", margin, y); y += 24;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(90);
    doc.text(`Week of ${thisWeek} · RAG: ${rag.toUpperCase()} · Exported ${new Date().toLocaleDateString()}`, margin, y);
    y += 20;
    doc.setTextColor(20);
    const sections: [string, string][] = [
      ["Achievements this week", ach],
      ["Plan for next week", next],
      ["Risks & blockers", risks],
    ];
    for (const [label, body] of sections) {
      if (!body?.trim()) continue;
      if (y > pageHeight - margin - 60) { doc.addPage(); y = margin; }
      doc.setFont("helvetica", "bold"); doc.setFontSize(12);
      doc.text(label, margin, y); y += 16;
      doc.setFont("helvetica", "normal"); doc.setFontSize(10);
      const lines = doc.splitTextToSize(body, maxWidth) as string[];
      for (const line of lines) {
        if (y > pageHeight - margin) { doc.addPage(); y = margin; }
        doc.text(line, margin, y); y += 13;
      }
      y += 8;
    }
    doc.save(`status-report-${thisWeek}.pdf`);
  }

  const past = (reports ?? []).filter((r) => r.week_start !== thisWeek);
  const submitted = (reports ?? []).filter((r) => r.submitted_at);

  return (
    <div className="space-y-10">
      <header>
        <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Cadence</div>
        <h1 className="font-display text-4xl font-medium">Weekly status report</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Every Monday, send a status report to the sponsor. The AI panel scores it and Mr Okafor reacts in your inbox.
        </p>
        {search.task && linkedTask && (
          <div className="mt-3 inline-flex items-start gap-2 rounded-md border border-primary/40 bg-primary/5 px-3 py-2 text-xs">
            <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" />
            <div>
              <div className="font-medium">Completing task: {linkedTask.title}</div>
              {linkedTask.completion_action && (
                <div className="mt-0.5 text-muted-foreground">→ {linkedTask.completion_action}</div>
              )}
              <div className="mt-1 text-muted-foreground">
                Submit the report below — Atlas will open the submission dialog to close the linked task.
              </div>
            </div>
          </div>
        )}
      </header>

      <TaskContextPanel taskId={search.task} />

      <WhyThisMatters
        storageKey="reports"
        title="Why you're writing a Status Report"
        body={
          <>
            <p>
              The Status Report isn't paperwork — it's how you buy sponsor trust and
              buy yourself early warning. A green report that hides risks is worse than
              an amber one that names them.
            </p>
            <p>
              The sponsor doesn't want to be surprised. If they hear about a slip from
              you first, with a mitigation and a decision to make, you're a PM they can
              back. If they hear about it from someone else, you've lost the room.
            </p>
          </>
        }
        tip="If your RAG is amber or red, always tell the sponsor what decision you need from them."
      />

      <ReportingPack />

      <section className="rounded-lg border border-border bg-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Week of</div>
            <div className="font-display text-2xl">{thisWeek}</div>
          </div>
          <div className="flex items-center gap-2">
            {(["green", "amber", "red"] as Rag[]).map((c) => (
              <button
                key={c}
                onClick={() => setRag(c)}
                className={`flex items-center gap-2 rounded-md border px-3 py-2 text-xs uppercase tracking-wider transition ${
                  rag === c ? "border-foreground bg-foreground text-background" : "border-border text-muted-foreground"
                }`}
              >
                <span className={`h-2.5 w-2.5 rounded-full ${ragDot[c]}`} /> {c}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 grid gap-4">
          <Field label="Achievements this week" value={ach} setValue={setAch} placeholder="What got done? Be specific — name artefacts, decisions, milestones." />
          <Field label="Plan for next week" value={next} setValue={setNext} placeholder="Top 3-5 priorities, with owners and dates." />
          <Field label="Risks & blockers" value={risks} setValue={setRisks} placeholder="What could derail us? What do you need from the sponsor?" />
          <Field label="Decisions needed from sponsor" value={decisions} setValue={setDecisions} placeholder="What decisions do you need this week — from whom, by when, and what's the impact of delay?" />
          <Field label="Budget note" value={budgetNote} setValue={setBudgetNote} placeholder="One or two lines on the financial picture: variance, forecast, contingency, notable commitments." />
        </div>

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Button variant="ghost" onClick={exportPdf}>
            <Download className="mr-2 h-4 w-4" /> Export PDF
          </Button>
          <Button variant="outline" onClick={() => save.mutate(false)} disabled={save.isPending}>
            <Save className="mr-2 h-4 w-4" /> Save draft
          </Button>
          <Button onClick={() => save.mutate(true)} disabled={save.isPending}>
            <Send className="mr-2 h-4 w-4" /> Submit to sponsor
          </Button>
        </div>

        {current?.ai_feedback ? (
          <FeedbackBox fb={current.ai_feedback as FB} score={current.ai_score ?? 0} />
        ) : null}
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-2xl">Past reports</h2>
        <p className="text-sm text-muted-foreground">
          Every submitted status report is archived here. Download as Word or PDF for your records.
        </p>
        {submitted.length === 0 && (
          <EmptyState
            icon={FileClock}
            title="No status reports filed yet."
            body="Sponsors are watching quietly. A short weekly note keeps trust warm — even when there's nothing dramatic to report."
            compact
          />
        )}
        <ul className="space-y-2">
          {submitted.map((r) => (
            <li key={r.id} className="rounded-md border border-border bg-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className={`h-2.5 w-2.5 rounded-full ${ragDot[r.rag_summary as Rag]}`} />
                  <span className="font-medium">Week of {r.week_start}</span>
                  {r.week_start === thisWeek && (
                    <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs text-primary">this week</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {r.ai_score != null ? `${r.ai_score}/100` : "Not scored"}
                  </span>
                  <Button size="sm" variant="outline" onClick={() => downloadReport(r as unknown as ReportRow, "doc")}>
                    <FileText className="mr-1.5 h-3.5 w-3.5" /> Word
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => downloadReport(r as unknown as ReportRow, "pdf")}>
                    <Download className="mr-1.5 h-3.5 w-3.5" /> PDF
                  </Button>
                </div>
              </div>
              {r.ai_feedback ? (
                <div className="mt-2 text-xs text-muted-foreground">{(r.ai_feedback as FB).summary}</div>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

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

      {/* Reference: template payload derived from live report fields (used by the dialog when prefilled). */}
      <input type="hidden" data-status-report-payload value={encodeSubmission({
        kind: "template",
        template: "status_report",
        values: templateValues,
        readiness: evaluateStatusReport(templateValues, { projectName: (overview as any)?.state?.project_name ?? null }),
      })} />
    </div>
  );
}

type FB = {
  summary: string;
  strengths: string[];
  weaknesses: string[];
  sponsor_reaction: string;
};

function FeedbackBox({ fb, score }: { fb: FB; score: number }) {
  return (
    <div className="mt-6 rounded-md border border-border bg-background p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-primary font-display text-lg font-semibold text-primary">
          {score}
        </div>
        <div className="text-sm font-medium">{fb.summary}</div>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div>
          <div className="text-xs font-semibold uppercase tracking-widest text-emerald-700 dark:text-emerald-400">Strengths</div>
          <ul className="mt-1 space-y-1 text-sm">
            {fb.strengths.map((s, i) => <li key={i}>• {s}</li>)}
          </ul>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-widest text-orange-700 dark:text-orange-400">Weaknesses</div>
          <ul className="mt-1 space-y-1 text-sm">
            {fb.weaknesses.map((s, i) => <li key={i}>• {s}</li>)}
          </ul>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, setValue, placeholder }: { label: string; value: string; setValue: (v: string) => void; placeholder: string }) {
  return (
    <div>
      <div className="mb-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">{label}</div>
      <Textarea value={value} onChange={(e) => setValue(e.target.value)} placeholder={placeholder} className="min-h-[100px]" />
    </div>
  );
}