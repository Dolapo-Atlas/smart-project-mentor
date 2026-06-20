import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listStatusReports, upsertStatusReport } from "@/lib/pm.functions";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Send, Save } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/reports")({
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

function Reports() {
  const qc = useQueryClient();
  const fetchReports = useServerFn(listStatusReports);
  const upsert = useServerFn(upsertStatusReport);
  const { data: reports } = useQuery({ queryKey: ["status_reports"], queryFn: () => fetchReports() });

  const thisWeek = mondayOf();
  const current = reports?.find((r) => r.week_start === thisWeek);

  const [rag, setRag] = useState<Rag>((current?.rag_summary as Rag) ?? "amber");
  const [ach, setAch] = useState(current?.achievements ?? "");
  const [next, setNext] = useState(current?.next_week ?? "");
  const [risks, setRisks] = useState(current?.risks_blockers ?? "");

  const save = useMutation({
    mutationFn: (submit: boolean) =>
      upsert({ data: { week_start: thisWeek, rag_summary: rag, achievements: ach, next_week: next, risks_blockers: risks, submit } }),
    onSuccess: (_d, submit) => {
      qc.invalidateQueries({ queryKey: ["status_reports"] });
      qc.invalidateQueries({ queryKey: ["inbox"] });
      toast.success(submit ? "Submitted to sponsor." : "Draft saved.");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const past = (reports ?? []).filter((r) => r.week_start !== thisWeek);

  return (
    <div className="space-y-10">
      <header>
        <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Cadence</div>
        <h1 className="font-display text-4xl font-medium">Weekly status report</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Every Monday, send a status report to the sponsor. The AI panel scores it and Mr Okafor reacts in your inbox.
        </p>
      </header>

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
        </div>

        <div className="mt-5 flex flex-wrap justify-end gap-2">
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
        {past.length === 0 && (
          <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No past reports yet.
          </div>
        )}
        <ul className="space-y-2">
          {past.map((r) => (
            <li key={r.id} className="rounded-md border border-border bg-card p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`h-2.5 w-2.5 rounded-full ${ragDot[r.rag_summary as Rag]}`} />
                  <span className="font-medium">Week of {r.week_start}</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {r.ai_score != null ? `${r.ai_score}/100` : "Not scored"}
                </span>
              </div>
              {r.ai_feedback ? (
                <div className="mt-2 text-xs text-muted-foreground">{(r.ai_feedback as FB).summary}</div>
              ) : null}
            </li>
          ))}
        </ul>
      </section>
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