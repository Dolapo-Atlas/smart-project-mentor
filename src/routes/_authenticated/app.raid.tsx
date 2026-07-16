import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listRaid, createRaid, updateRaidStatus, deleteRaid, submitRaidLog,
} from "@/lib/raid.functions";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Trash2, Plus, Paperclip, ShieldAlert, AlertOctagon, Link2, HelpCircle, LayoutTemplate } from "lucide-react";
import { toast } from "sonner";
import { useRoster } from "@/lib/roster";
import { format } from "date-fns";

export const Route = createFileRoute("/_authenticated/app/raid")({
  component: RaidPage,
});

type Kind = "risk" | "assumption" | "issue" | "dependency";
type Sev = "low" | "medium" | "high" | "critical";
type Status = "open" | "mitigating" | "closed";

const KIND_TABS: { key: Kind; label: string; icon: typeof ShieldAlert; help: string }[] = [
  { key: "risk", label: "Risks", icon: ShieldAlert, help: "Future events that could impact the project." },
  { key: "assumption", label: "Assumptions", icon: HelpCircle, help: "Beliefs taken to be true for planning." },
  { key: "issue", label: "Issues", icon: AlertOctagon, help: "Problems happening right now." },
  { key: "dependency", label: "Dependencies", icon: Link2, help: "Work this project depends on elsewhere." },
];

const priorityStyle: Record<Sev, string> = {
  low: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
  medium: "bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/30",
  high: "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/30",
  critical: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/40",
};

const statusStyle: Record<Status, string> = {
  open: "border-amber-500/40 text-amber-700 dark:text-amber-300",
  mitigating: "border-blue-500/40 text-blue-700 dark:text-blue-300",
  closed: "border-emerald-500/40 text-emerald-700 dark:text-emerald-400",
};

function fmt(d: string | null | undefined) {
  if (!d) return "—";
  try { return format(new Date(d), "d MMM yyyy"); } catch { return d; }
}

function RaidPage() {
  const qc = useQueryClient();
  const fetchRaid = useServerFn(listRaid);
  const addRaid = useServerFn(createRaid);
  const setStatusFn = useServerFn(updateRaidStatus);
  const delRaidFn = useServerFn(deleteRaid);
  const submitRaidFn = useServerFn(submitRaidLog);
  const roster = useRoster();

  const { data: raid } = useQuery({ queryKey: ["raid"], queryFn: () => fetchRaid() });

  const [tab, setTab] = useState<Kind>("risk");

  // Deep-link support: /app/raid#risk|assumption|issue|dependency
  useEffect(() => {
    if (typeof window === "undefined") return;
    const h = window.location.hash.replace("#", "").toLowerCase();
    if (h === "risk" || h === "assumption" || h === "issue" || h === "dependency") {
      setTab(h as Kind);
    }
  }, []);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    kind: "risk" as Kind,
    title: "",
    description: "",
    severity: "medium" as Sev,
    likelihood: "medium" as Sev,
    priority: "medium" as Sev,
    owner: "",
    mitigation: "",
    target_date: "",
    comments: "",
  });

  const create = useMutation({
    mutationFn: () => addRaid({ data: {
      kind: form.kind,
      title: form.title,
      description: form.description || undefined,
      severity: form.severity,
      likelihood: form.likelihood,
      priority: form.priority,
      owner: form.owner || undefined,
      mitigation: form.mitigation || undefined,
      target_date: form.target_date || undefined,
      comments: form.comments || undefined,
    } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["raid"] });
      qc.invalidateQueries({ queryKey: ["overview"] });
      qc.invalidateQueries({ queryKey: ["inbox"] });
      qc.invalidateQueries({ queryKey: ["tasks"] });
      setForm({ ...form, title: "", description: "", owner: "", mitigation: "", target_date: "", comments: "" });
      setShowForm(false);
      toast.success("Logged to RAID register.");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const submit = useMutation({
    mutationFn: () => submitRaidFn(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["raid"] });
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["inbox"] });
      toast.success("RAID Log submitted to Sponsor for review.");
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

  const counts: Record<Kind, number> = { risk: 0, assumption: 0, issue: 0, dependency: 0 };
  (raid ?? []).forEach((r) => { counts[r.kind as Kind] = (counts[r.kind as Kind] ?? 0) + 1; });
  const rows = (raid ?? []).filter((r) => r.kind === tab);
  const activeTab = KIND_TABS.find((t) => t.key === tab)!;

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Governance</div>
          <h1 className="font-display text-4xl font-medium">RAID Log</h1>
          <p className="mt-1 text-sm text-muted-foreground">Risks · Assumptions · Issues · Dependencies</p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/app/templates">
              <LayoutTemplate className="mr-2 h-4 w-4" /> Templates
            </Link>
          </Button>
          {(raid ?? []).length >= 3 && (
            <Button variant="outline" onClick={() => submit.mutate()} disabled={submit.isPending}>
              Submit log for review
            </Button>
          )}
          <Button onClick={() => { setForm({ ...form, kind: tab }); setShowForm((v) => !v); }}>
            <Plus className="mr-2 h-4 w-4" /> New entry
          </Button>
        </div>
      </header>

      <nav className="flex flex-wrap gap-2 border-b border-border">
        {KIND_TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 border-b-2 px-3 pb-2 pt-1 text-sm font-medium transition ${
              tab === key
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="h-4 w-4" /> {label}
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">{counts[key]}</span>
          </button>
        ))}
      </nav>

      <p className="text-xs text-muted-foreground">{activeTab.help}</p>

      {showForm && (
        <div className="rounded-lg border border-border bg-card p-5">
          <div className="mb-3 font-display text-lg">New {tab}</div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input placeholder="Title…" value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <select value={form.owner}
              onChange={(e) => setForm({ ...form, owner: e.target.value })}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm">
              <option value="">Owner (unassigned)</option>
              {roster.map((s) => (
                <option key={s.role} value={s.name}>{s.name} — {s.title}</option>
              ))}
            </select>
            <select value={form.priority}
              onChange={(e) => setForm({ ...form, priority: e.target.value as Sev })}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm">
              <option value="low">Priority: Low</option>
              <option value="medium">Priority: Medium</option>
              <option value="high">Priority: High</option>
              <option value="critical">Priority: Critical</option>
            </select>
            <Input type="date" value={form.target_date}
              onChange={(e) => setForm({ ...form, target_date: e.target.value })} />
            <select value={form.severity}
              onChange={(e) => setForm({ ...form, severity: e.target.value as Sev })}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm">
              <option value="low">Severity: Low</option>
              <option value="medium">Severity: Medium</option>
              <option value="high">Severity: High</option>
              <option value="critical">Severity: Critical</option>
            </select>
            <select value={form.likelihood}
              onChange={(e) => setForm({ ...form, likelihood: e.target.value as Sev })}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm">
              <option value="low">Likelihood: Low</option>
              <option value="medium">Likelihood: Medium</option>
              <option value="high">Likelihood: High</option>
              <option value="critical">Likelihood: Critical</option>
            </select>
          </div>
          <Textarea className="mt-3" placeholder="Description / context…"
            value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <Textarea className="mt-3" placeholder="Mitigation / action…"
            value={form.mitigation} onChange={(e) => setForm({ ...form, mitigation: e.target.value })} />
          <Textarea className="mt-3" placeholder="Comments…"
            value={form.comments} onChange={(e) => setForm({ ...form, comments: e.target.value })} />
          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Paperclip className="h-3.5 w-3.5" /> Attachments coming soon
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={() => create.mutate()} disabled={!form.title.trim() || create.isPending}>
                Add to register
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Ref</th>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Owner</th>
              <th className="px-4 py-3">Priority</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Raised</th>
              <th className="px-4 py-3">Target</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-sm text-muted-foreground">
                No {tab}s logged. Click <span className="font-medium text-foreground">New entry</span> to add one.
              </td></tr>
            )}
            {rows.map((r, i) => {
              const pri = ((r as any).priority ?? r.severity ?? "medium") as Sev;
              const ref = `${tab.toUpperCase().slice(0, 1)}-${String(i + 1).padStart(3, "0")}`;
              const raised = (r as any).date_raised ?? r.created_at;
              const target = (r as any).target_date ?? r.due_date;
              return (
                <tr key={r.id} className="border-t border-border align-top">
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{ref}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{r.title}</div>
                    {r.description && <div className="mt-1 text-xs text-muted-foreground">{r.description}</div>}
                    {r.mitigation && <div className="mt-1 text-xs"><span className="font-semibold">Mitigation: </span><span className="text-muted-foreground">{r.mitigation}</span></div>}
                    {(r as any).comments && <div className="mt-1 text-xs italic text-muted-foreground">"{(r as any).comments}"</div>}
                  </td>
                  <td className="px-4 py-3 text-xs">{r.owner ?? <span className="text-muted-foreground">Unassigned</span>}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-md border px-2 py-0.5 text-[11px] capitalize ${priorityStyle[pri]}`}>{pri}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      {(["open", "mitigating", "closed"] as Status[]).map((s) => (
                        <button key={s} onClick={() => setStatus.mutate({ id: r.id, status: s })}
                          className={`rounded-md border px-2 py-0.5 text-[10px] uppercase tracking-wider transition ${
                            r.status === s ? "border-foreground bg-foreground text-background" : `bg-background ${statusStyle[s]}`
                          }`}>{s}</button>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{fmt(raised)}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{fmt(target)}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => del.mutate(r.id)} className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}