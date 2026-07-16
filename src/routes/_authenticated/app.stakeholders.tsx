import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useSearch, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { StakeholderAvatar } from "@/components/stakeholder-avatar";
import { useStakeholders, StakeholderProfileDialog } from "@/components/stakeholder-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Save, Send, Download, FileText, ClipboardList } from "lucide-react";
import jsPDF from "jspdf";
import {
  getOrCreateRegister,
  saveRegisterDraft,
  submitRegister,
  listRegisterVersions,
  type RegisterRow,
} from "@/lib/stakeholder-register.functions";
import { TEMPLATES } from "@/lib/templates";

const stakeholdersSearchSchema = z.object({
  task: z.string().uuid().optional(),
  register: z.coerce.boolean().optional(),
});

export const Route = createFileRoute("/_authenticated/app/stakeholders")({
  validateSearch: stakeholdersSearchSchema,
  component: StakeholdersPage,
});

function sentimentMeta(s: number) {
  if (s >= 60) return { label: "Champion", color: "text-emerald-600", bar: "bg-emerald-500" };
  if (s >= 20) return { label: "Supportive", color: "text-emerald-500", bar: "bg-emerald-500" };
  if (s >= -19) return { label: "Neutral", color: "text-muted-foreground", bar: "bg-slate-400" };
  if (s >= -59) return { label: "Frustrated", color: "text-orange-500", bar: "bg-orange-500" };
  return { label: "Hostile", color: "text-red-600", bar: "bg-red-500" };
}

function StakeholdersPage() {
  const { data, isLoading } = useStakeholders();
  const [active, setActive] = useState<string | null>(null);
  const search = useSearch({ from: "/_authenticated/app/stakeholders" });
  const navigate = useNavigate();
  const showRegister = Boolean(search.register || search.task);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">Stakeholders</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your working relationships. Click anyone to log concerns, or open the register to formalise engagement.
          </p>
        </div>
        <Button
          variant={showRegister ? "secondary" : "outline"}
          onClick={() =>
            navigate({ to: "/app/stakeholders", search: showRegister ? {} : { register: true } })
          }
        >
          <ClipboardList className="mr-2 h-4 w-4" />
          {showRegister ? "Hide register" : "Stakeholder register"}
        </Button>
      </div>

      {showRegister && <RegisterPanel taskId={search.task} />}

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data?.map((s) => {
            const m = sentimentMeta(s.sentiment);
            const pct = ((s.sentiment + 100) / 200) * 100;
            return (
              <button
                key={s.name}
                type="button"
                onClick={() => setActive(s.name)}
                className="group rounded-xl border border-border bg-card p-4 text-left shadow-sm transition hover:border-foreground/30 hover:shadow-md"
              >
                <div className="flex items-center gap-3">
                  <StakeholderAvatar name={s.name} size="lg" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold">{s.name}</div>
                    <div className="truncate text-xs text-muted-foreground">{s.role}</div>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Sentiment</span>
                    <span className={`font-medium ${m.color}`}>
                      {m.label} ({s.sentiment > 0 ? "+" : ""}{s.sentiment})
                    </span>
                  </div>
                  <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div className="absolute inset-y-0 left-1/2 w-px bg-border" />
                    <div
                      className={`h-full ${m.bar}`}
                      style={{
                        marginLeft: s.sentiment >= 0 ? "50%" : `${pct}%`,
                        width: `${Math.abs(s.sentiment) / 2}%`,
                      }}
                    />
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>{s.concerns.length} concern{s.concerns.length === 1 ? "" : "s"} logged</span>
                  <span>{s.interaction_count} interactions</span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {active && (
        <StakeholderProfileDialog
          name={active}
          open={!!active}
          onOpenChange={(v) => !v && setActive(null)}
        />
      )}
    </div>
  );
}

function RegisterPanel({ taskId }: { taskId?: string }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const getOrCreate = useServerFn(getOrCreateRegister);
  const saveFn = useServerFn(saveRegisterDraft);
  const submitFn = useServerFn(submitRegister);
  const versionsFn = useServerFn(listRegisterVersions);

  const { data: reg } = useQuery<RegisterRow>({
    queryKey: ["stakeholder-register", taskId ?? "current"],
    queryFn: () => getOrCreate({ data: { task_id: taskId } }),
  });
  const { data: versions } = useQuery({
    queryKey: ["stakeholder-register-versions"],
    queryFn: () => versionsFn(),
  });

  const [payload, setPayload] = useState<Record<string, string>>({});
  useEffect(() => {
    if (reg) setPayload((reg.payload ?? {}) as Record<string, string>);
  }, [reg?.id]);

  const spec = TEMPLATES.stakeholder_register.fields;
  const pct = useMemo(() => {
    const total = spec.reduce((s, f) => s + (f.required ? 2 : 1), 0);
    let earned = 0;
    for (const f of spec) {
      const v = (payload[f.key] ?? "").trim();
      const min = f.minChars ?? 0;
      const ok = v.length >= min && (!f.required || v.length > 0);
      if (ok) earned += f.required ? 2 : 1;
    }
    return Math.round((earned / total) * 100);
  }, [payload, spec]);

  const save = useMutation({
    mutationFn: () => saveFn({ data: { id: reg!.id, payload } }),
    onSuccess: () => {
      toast.success("Draft saved");
      qc.invalidateQueries({ queryKey: ["stakeholder-register"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const submit = useMutation({
    mutationFn: async () => {
      await saveFn({ data: { id: reg!.id, payload } });
      return submitFn({ data: { id: reg!.id } });
    },
    onSuccess: () => {
      toast.success("Register submitted");
      qc.invalidateQueries({ queryKey: ["stakeholder-register"] });
      qc.invalidateQueries({ queryKey: ["stakeholder-register-versions"] });
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["inbox"] });
      qc.invalidateQueries({ queryKey: ["phase-progress"] });
      if (taskId) navigate({ to: "/app/tasks" });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  function exportPdf() {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const margin = 48;
    let y = margin;
    doc.setFont("times", "bold"); doc.setFontSize(18);
    doc.text("Stakeholder Register", margin, y); y += 24;
    doc.setFont("times", "normal"); doc.setFontSize(10);
    doc.text(`v${reg?.version ?? 1}  ·  ${pct}% complete`, margin, y); y += 20;
    for (const f of spec) {
      const v = (payload[f.key] ?? "").trim();
      if (!v) continue;
      doc.setFont("times", "bold"); doc.setFontSize(12); doc.text(f.label, margin, y); y += 16;
      doc.setFont("times", "normal"); doc.setFontSize(11);
      const lines = doc.splitTextToSize(v, 500);
      lines.forEach((ln: string) => { if (y > 780) { doc.addPage(); y = margin; } doc.text(ln, margin, y); y += 14; });
      y += 6;
    }
    doc.save(`stakeholder-register-v${reg?.version ?? 1}.pdf`);
  }

  if (!reg) {
    return <div className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">Loading register…</div>;
  }

  return (
    <section className="rounded-lg border border-border bg-card p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Artefact</div>
          <h2 className="font-display text-2xl font-medium">Stakeholder Register</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            {taskId ? "Linked to a task — submitting closes the task through the shared readiness pipeline." : "Ongoing artefact. Save drafts freely; each submit snapshots a new version."}
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="rounded-full border border-border px-2 py-0.5">{pct}% complete</span>
          <span className="rounded-full border border-border px-2 py-0.5">v{reg.version}</span>
          <span className="rounded-full border border-border px-2 py-0.5 capitalize">{reg.approval_status}</span>
        </div>
      </div>

      <div className="mt-5 grid gap-4">
        {spec.map((f) => (
          <label key={f.key} className="block">
            <div className="mb-1 flex items-center justify-between text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              <span>{f.label}{f.required && <span className="ml-1 text-destructive">*</span>}</span>
              {f.minChars ? <span className="text-[10px] normal-case text-muted-foreground/70">min {f.minChars} chars</span> : null}
            </div>
            {f.kind === "text" ? (
              <Input
                value={payload[f.key] ?? ""}
                onChange={(e) => setPayload({ ...payload, [f.key]: e.target.value })}
                placeholder={f.placeholder}
              />
            ) : (
              <Textarea
                value={payload[f.key] ?? ""}
                onChange={(e) => setPayload({ ...payload, [f.key]: e.target.value })}
                placeholder={f.placeholder}
                className="min-h-[100px]"
              />
            )}
            {f.guidance && <div className="mt-1 text-[11px] text-muted-foreground">{f.guidance}</div>}
          </label>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
        <Button variant="outline" onClick={exportPdf}>
          <Download className="mr-2 h-4 w-4" /> PDF
        </Button>
        <Button variant="outline" onClick={() => save.mutate()} disabled={save.isPending}>
          <Save className="mr-2 h-4 w-4" /> {save.isPending ? "Saving…" : "Save draft"}
        </Button>
        <Button onClick={() => submit.mutate()} disabled={submit.isPending || pct < 40}>
          <Send className="mr-2 h-4 w-4" /> {submit.isPending ? "Submitting…" : taskId ? "Submit & close task" : "Submit for review"}
        </Button>
      </div>

      {(versions?.length ?? 0) > 0 && (
        <div className="mt-6 border-t border-border pt-4">
          <div className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Version history</div>
          <ul className="space-y-1 text-sm">
            {versions!.map((v) => (
              <li key={v.id} className="flex items-center justify-between rounded border border-border/60 bg-background px-3 py-2">
                <span className="flex items-center gap-2"><FileText className="h-3.5 w-3.5 text-muted-foreground" /> v{v.version}</span>
                <span className="text-xs text-muted-foreground">{v.completion_pct}% · {new Date(v.submitted_at).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}