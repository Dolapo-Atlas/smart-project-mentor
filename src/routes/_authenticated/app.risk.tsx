import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listRaid, createRaid, updateRaidStatus, deleteRaid,
  listRag, upsertRag, submitRaidLog,
} from "@/lib/raid.functions";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Trash2, Plus, Mail } from "lucide-react";
import { toast } from "sonner";
import { STAKEHOLDERS } from "@/lib/stakeholders";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/app/risk")({
  component: RiskPage,
});

type Kind = "risk" | "assumption" | "issue" | "dependency";
type Sev = "low" | "medium" | "high" | "critical";
type Status = "open" | "mitigating" | "closed";
type Rag = "green" | "amber" | "red";
type Area =
  | "scope" | "schedule" | "budget" | "quality"
  | "resources" | "stakeholders" | "risks";

const AREAS: { key: Area; label: string }[] = [
  { key: "scope", label: "Scope" },
  { key: "schedule", label: "Schedule" },
  { key: "budget", label: "Budget" },
  { key: "quality", label: "Quality" },
  { key: "resources", label: "Resources" },
  { key: "stakeholders", label: "Stakeholders" },
  { key: "risks", label: "Risks" },
];

const ragDot: Record<Rag, string> = {
  green: "bg-emerald-500",
  amber: "bg-amber-500",
  red: "bg-red-500",
};

const kindStyle: Record<Kind, string> = {
  risk: "bg-red-500/10 text-red-700 dark:text-red-400",
  assumption: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  issue: "bg-orange-500/10 text-orange-700 dark:text-orange-400",
  dependency: "bg-purple-500/10 text-purple-700 dark:text-purple-400",
};

function RiskPage() {
  const qc = useQueryClient();
  const fetchRaid = useServerFn(listRaid);
  const fetchRag = useServerFn(listRag);
  const addRaid = useServerFn(createRaid);
  const setStatusFn = useServerFn(updateRaidStatus);
  const delRaidFn = useServerFn(deleteRaid);
  const upsertRagFn = useServerFn(upsertRag);
  const submitRaidFn = useServerFn(submitRaidLog);

  const { data: raid } = useQuery({ queryKey: ["raid"], queryFn: () => fetchRaid() });
  const { data: rag } = useQuery({ queryKey: ["rag"], queryFn: () => fetchRag() });

  const ragByArea: Record<string, { rag: Rag; note: string | null }> = {};
  (rag ?? []).forEach((r) => {
    ragByArea[r.area] = { rag: r.rag as Rag, note: r.note };
  });

  const setRag = useMutation({
    mutationFn: (v: { area: Area; rag: Rag; note?: string }) => upsertRagFn({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rag"] }),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const [form, setForm] = useState({
    kind: "risk" as Kind,
    title: "",
    description: "",
    severity: "medium" as Sev,
    likelihood: "medium" as Sev,
    owner: "",
    mitigation: "",
  });

  const create = useMutation({
    mutationFn: () => addRaid({ data: { ...form, description: form.description || undefined, owner: form.owner || undefined, mitigation: form.mitigation || undefined } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["raid"] });
      qc.invalidateQueries({ queryKey: ["rag"] });
      qc.invalidateQueries({ queryKey: ["inbox"] });
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["overview"] });
      setForm({ ...form, title: "", description: "", owner: "", mitigation: "" });
      toast.success("RAID item logged. Stakeholders may respond.");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const submit = useMutation({
    mutationFn: () => submitRaidFn(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["raid"] });
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["inbox"] });
      qc.invalidateQueries({ queryKey: ["overview"] });
      toast.success("Initial RAID Log submitted for review.");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const setStatus = useMutation({
    mutationFn: (v: { id: string; status: Status }) => setStatusFn({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["raid"] }),
  });

  const del = useMutation({
    mutationFn: (id: string) => delRaidFn({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["raid"] }),
  });

  const grouped: Record<Kind, typeof raid extends (infer T)[] | undefined ? T[] : never[]> = {
    risk: [], assumption: [], issue: [], dependency: [],
  } as never;
  (raid ?? []).forEach((r) => {
    (grouped[r.kind as Kind] as typeof raid extends (infer T)[] | undefined ? T[] : never[]).push(r as never);
  });

  return (
    <div className="space-y-10">
      <header>
        <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Governance</div>
        <h1 className="font-display text-4xl font-medium">Risk &amp; RAG</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Track your project's health by workstream (RAG) and log Risks, Assumptions,
          Issues, and Dependencies (RAID). Both feed your governance reporting.
        </p>
      </header>

      <section className="space-y-4">
        <h2 className="font-display text-2xl">RAG dashboard</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {AREAS.map(({ key, label }) => {
            const current = ragByArea[key]?.rag ?? "green";
            return (
              <div key={key} className="rounded-md border border-border bg-card p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`h-3 w-3 rounded-full ${ragDot[current]}`} />
                    <span className="font-medium">{label}</span>
                  </div>
                </div>
                <div className="mt-3 flex gap-1">
                  {(["green", "amber", "red"] as Rag[]).map((c) => (
                    <button
                      key={c}
                      onClick={() => setRag.mutate({ area: key, rag: c, note: ragByArea[key]?.note ?? undefined })}
                      className={`flex-1 rounded-md border px-2 py-1 text-xs uppercase tracking-wider transition ${
                        current === c
                          ? "border-foreground bg-foreground text-background"
                          : "border-border text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
                <Textarea
                  placeholder="Note (optional)…"
                  defaultValue={ragByArea[key]?.note ?? ""}
                  onBlur={(e) => {
                    const note = e.target.value;
                    if (note !== (ragByArea[key]?.note ?? "")) {
                      setRag.mutate({ area: key, rag: current, note });
                    }
                  }}
                  className="mt-3 min-h-[60px] text-xs"
                />
              </div>
            );
          })}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-2xl">RAID log</h2>
        {(raid ?? []).length >= 3 && (
          <div className="flex items-center justify-between rounded-md border border-border bg-card p-4">
            <div className="text-sm text-muted-foreground">
              You have {(raid ?? []).length} RAID entries. Ready to send to Sarah for review?
            </div>
            <Button onClick={() => submit.mutate()} disabled={submit.isPending}>
              Submit RAID Log for Review
            </Button>
          </div>
        )}

        <div className="rounded-lg border border-border bg-card p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <select
              value={form.kind}
              onChange={(e) => setForm({ ...form, kind: e.target.value as Kind })}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="risk">Risk</option>
              <option value="assumption">Assumption</option>
              <option value="issue">Issue</option>
              <option value="dependency">Dependency</option>
            </select>
            <Input
              placeholder="Title…"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
            <select
              value={form.severity}
              onChange={(e) => setForm({ ...form, severity: e.target.value as Sev })}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="low">Severity: Low</option>
              <option value="medium">Severity: Medium</option>
              <option value="high">Severity: High</option>
              <option value="critical">Severity: Critical</option>
            </select>
            <select
              value={form.likelihood}
              onChange={(e) => setForm({ ...form, likelihood: e.target.value as Sev })}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="low">Likelihood: Low</option>
              <option value="medium">Likelihood: Medium</option>
              <option value="high">Likelihood: High</option>
              <option value="critical">Likelihood: Critical</option>
            </select>
            <select
              value={form.owner}
              onChange={(e) => setForm({ ...form, owner: e.target.value })}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Owner (unassigned)</option>
              {STAKEHOLDERS.map((s) => (
                <option key={s.role} value={s.name}>{s.name} — {s.title}</option>
              ))}
            </select>
          </div>
          <Textarea
            placeholder="Description / context…"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="mt-3"
          />
          <Textarea
            placeholder="Mitigation / response (optional)…"
            value={form.mitigation}
            onChange={(e) => setForm({ ...form, mitigation: e.target.value })}
            className="mt-3"
          />
          <div className="mt-3 flex justify-end">
            <Button onClick={() => create.mutate()} disabled={!form.title.trim() || create.isPending}>
              <Plus className="mr-2 h-4 w-4" /> Add to log
            </Button>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {(["risk", "issue", "dependency", "assumption"] as Kind[]).map((k) => {
            const items = (raid ?? []).filter((r) => r.kind === k);
            return (
              <div key={k} className="rounded-lg border border-border bg-card p-5">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-display text-lg capitalize">{k}s</h3>
                  <span className="text-xs text-muted-foreground">{items.length}</span>
                </div>
                {items.length === 0 && (
                  <div className="rounded-md border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                    None logged.
                  </div>
                )}
                <ul className="space-y-2">
                  {items.map((r) => (
                    <li key={r.id} className="rounded-md border border-border bg-background p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wider ${kindStyle[r.kind as Kind]}`}>
                              {r.kind}
                            </span>
                            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                              {r.severity} · {r.likelihood} likelihood
                            </span>
                          </div>
                          <div className="mt-1 text-sm font-medium">{r.title}</div>
                          {r.description && (
                            <div className="mt-1 text-xs text-muted-foreground">{r.description}</div>
                          )}
                          {r.mitigation && (
                            <div className="mt-1 text-xs">
                              <span className="font-semibold">Mitigation: </span>
                              <span className="text-muted-foreground">{r.mitigation}</span>
                            </div>
                          )}
                          {r.owner && (
                            <div className="mt-2">
                              <Link
                                to="/app/inbox"
                                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-2.5 py-1 text-[11px] font-medium hover:bg-muted hover:text-foreground"
                                title={`${r.owner} was emailed about this assignment`}
                              >
                                <Mail className="h-3 w-3" />
                                Owner · {r.owner}
                              </Link>
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => del.mutate(r.id)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="mt-2 flex gap-1">
                        {(["open", "mitigating", "closed"] as Status[]).map((s) => (
                          <button
                            key={s}
                            onClick={() => setStatus.mutate({ id: r.id, status: s })}
                            className={`flex-1 rounded-md border px-2 py-1 text-[10px] uppercase tracking-wider transition ${
                              r.status === s
                                ? "border-foreground bg-foreground text-background"
                                : "border-border text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}