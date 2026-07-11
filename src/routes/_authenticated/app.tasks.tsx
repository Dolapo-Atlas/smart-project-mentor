import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { updateTaskStatus, deleteTask } from "@/lib/sim.functions";
import {
  listTasksRich,
  createRichTask,
  submitTaskWithWork,
  closeTaskWithReview,
  escalateTask,
  TASK_CATEGORIES,
} from "@/lib/tasks.functions";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Check,
  Circle,
  CircleDot,
  Plus,
  Trash2,
  Inbox,
  Lock,
  ArrowUpRight,
  ShieldAlert,
  Send,
  Sparkles,
  Ban,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import { TimeControls } from "@/components/time-controls";
import { StakeholderHoverAvatar as StakeholderAvatar } from "@/components/stakeholder-card";
import { MentorTriggerButton } from "@/components/mentor/task-mentor";

export const Route = createFileRoute("/_authenticated/app/tasks")({
  component: Tasks,
});

type RichTask = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  category: string | null;
  linked_area: string | null;
  linked_stakeholder: string | null;
  linked_module_route: string | null;
  completion_action: string | null;
  due_at: string | null;
  source: string;
  feedback: any;
  submission: string | null;
  blocked_by: { id: string; title: string }[];
};

function Tasks() {
  const qc = useQueryClient();
  const fetchTasks = useServerFn(listTasksRich);
  const createFn = useServerFn(createRichTask);
  const updateFn = useServerFn(updateTaskStatus);
  const deleteFn = useServerFn(deleteTask);
  const submitFn = useServerFn(submitTaskWithWork);
  const closeFn = useServerFn(closeTaskWithReview);
  const escalateFn = useServerFn(escalateTask);
  const { data: tasks } = useQuery<RichTask[]>({
    queryKey: ["tasks"],
    queryFn: () => fetchTasks() as Promise<RichTask[]>,
  });

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high" | "critical">("medium");
  const [category, setCategory] = useState<string>("");
  const [submitTaskId, setSubmitTaskId] = useState<string | null>(null);
  const [submission, setSubmission] = useState("");

  const create = useMutation({
    mutationFn: () =>
      createFn({
        data: {
          title,
          description: description || undefined,
          priority,
          category: category || undefined,
        },
      }),
    onSuccess: () => {
      setTitle("");
      setDescription("");
      setPriority("medium");
      setCategory("");
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["overview"] });
      qc.invalidateQueries({ queryKey: ["whats-next"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const update = useMutation({
    mutationFn: (v: { id: string; status: "todo" | "in_progress" | "submitted" | "done" }) => updateFn({ data: v }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["overview"] });
      qc.invalidateQueries({ queryKey: ["whats-next"] });
    },
  });

  const del = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const submit = useMutation({
    mutationFn: (v: { id: string; submission: string }) => submitFn({ data: v }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["overview"] });
      qc.invalidateQueries({ queryKey: ["whats-next"] });
      toast.success("Submitted for review");
      setSubmitTaskId(null);
      setSubmission("");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const close = useMutation({
    mutationFn: (v: { id: string; decision: "approved" | "rework" }) => closeFn({ data: v }),
    onSuccess: (res: any) => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["overview"] });
      qc.invalidateQueries({ queryKey: ["whats-next"] });
      qc.invalidateQueries({ queryKey: ["stakeholders"] });
      if (res?.decision === "approved") {
        toast.success(
          res?.impact_summary?.length ? `Closed. ${res.impact_summary.join(" · ")}` : "Closed",
        );
      } else {
        toast.message("Sent back for rework");
      }
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const escalate = useMutation({
    mutationFn: (v: { id: string; mode: "assign_lead" | "ask_pm" | "escalate_sponsor" | "add_to_raid" }) =>
      escalateFn({ data: v }),
    onSuccess: (res: any) => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["overview"] });
      toast.success(`${res?.owner} has taken ownership`);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const grouped = {
    todo: tasks?.filter((t) => t.status === "todo") ?? [],
    in_progress: tasks?.filter((t) => t.status === "in_progress") ?? [],
    blocked: tasks?.filter((t) => t.status === "blocked") ?? [],
    submitted: tasks?.filter((t) => t.status === "submitted") ?? [],
    done: tasks?.filter((t) => t.status === "done" || t.status === "approved") ?? [],
  };

  const columnLabels: Record<keyof typeof grouped, string> = {
    todo: "To Do",
    in_progress: "In Progress",
    blocked: "Blocked",
    submitted: "Submitted",
    done: "Completed",
  };

  const submitTask = tasks?.find((t) => t.id === submitTaskId) ?? null;

  return (
    <div className="space-y-8">
      <header>
        <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Coordination</div>
        <h1 className="font-display text-4xl font-medium">Task board</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Tasks are how the project moves. Emails raise concerns — completing the linked tasks
          here is what actually resolves them, improves health, and shifts stakeholder sentiment.
          Submit your work, then close the task once the review accepts it.
        </p>
        <div className="mt-4"><TimeControls compact /></div>
        <div className="mt-2">
          <Link to="/app/completed" className="text-xs text-primary hover:underline">
            View completed work log →
          </Link>
        </div>
      </header>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!title.trim()) return;
          create.mutate();
        }}
        className="space-y-3 rounded-lg border border-border bg-card p-5"
      >
        <div className="flex flex-wrap items-start gap-3">
          <Input
            placeholder="Task title…"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="flex-1 min-w-[200px]"
          />
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              {TASK_CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={priority} onValueChange={(v) => setPriority(v as typeof priority)}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
            </SelectContent>
          </Select>
          <Button type="submit" disabled={create.isPending}>
            <Plus className="mr-2 h-4 w-4" /> Add
          </Button>
        </div>
        <Textarea
          placeholder="Optional notes…"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
        />
      </form>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-5">
        {(["todo", "in_progress", "blocked", "submitted", "done"] as const).map((status) => (
          <div key={status} className="rounded-lg border border-border bg-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-display text-lg font-semibold">{columnLabels[status]}</h3>
              <span className="text-xs text-muted-foreground">{grouped[status].length}</span>
            </div>
            <ul className="space-y-2">
              {grouped[status].length === 0 && (
                <li className="rounded-md border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                  Empty
                </li>
              )}
              {grouped[status].map((t) => (
                <TaskCard
                  key={t.id}
                  t={t}
                  onStart={() => update.mutate({ id: t.id, status: "in_progress" })}
                  onSubmitClick={() => {
                    setSubmitTaskId(t.id);
                    setSubmission("");
                  }}
                  onApprove={() => close.mutate({ id: t.id, decision: "approved" })}
                  onRework={() => close.mutate({ id: t.id, decision: "rework" })}
                  onEscalate={(mode) => escalate.mutate({ id: t.id, mode })}
                  onDelete={() => del.mutate(t.id)}
                  busy={close.isPending || submit.isPending || escalate.isPending}
                />
              ))}
            </ul>
          </div>
        ))}
      </div>

      <Dialog open={!!submitTaskId} onOpenChange={(o) => !o && setSubmitTaskId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit "{submitTask?.title}"</DialogTitle>
            <DialogDescription>
              {submitTask?.completion_action ??
                "Describe what you produced and where it lives (e.g. RAID log updated with 4 risks, document uploaded as PDF)."}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="What did you do? Paste a summary, link, or excerpt of your work…"
            value={submission}
            onChange={(e) => setSubmission(e.target.value)}
            rows={7}
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSubmitTaskId(null)}>Cancel</Button>
            <Button
              onClick={() =>
                submitTask && submit.mutate({ id: submitTask.id, submission: submission.trim() })
              }
              disabled={submission.trim().length < 5 || submit.isPending}
            >
              <Send className="mr-2 h-4 w-4" />
              {submit.isPending ? "Submitting…" : "Submit for review"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const PRIORITY_STYLE: Record<string, string> = {
  critical: "bg-red-500/15 text-red-700 dark:text-red-400",
  high: "bg-orange-500/15 text-orange-700 dark:text-orange-400",
  medium: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  low: "bg-muted text-muted-foreground",
};

function TaskCard({
  t,
  onStart,
  onSubmitClick,
  onApprove,
  onRework,
  onEscalate,
  onDelete,
  busy,
}: {
  t: RichTask;
  onStart: () => void;
  onSubmitClick: () => void;
  onApprove: () => void;
  onRework: () => void;
  onEscalate: (mode: "assign_lead" | "ask_pm" | "escalate_sponsor" | "add_to_raid") => void;
  onDelete: () => void;
  busy: boolean;
}) {
  const isBlocked = t.blocked_by.length > 0 && !["done", "approved"].includes(t.status);
  const overdue = t.due_at && +new Date(t.due_at) < Date.now() && !["done", "approved"].includes(t.status);
  const isComplete = t.status === "done" || t.status === "approved";
  const [expanded, setExpanded] = useState(false);
  const hasDetails = Boolean(t.completion_action || t.description);
  return (
    <li className="rounded-md border border-border bg-background p-3">
      <div className="flex items-start gap-2">
        <div className="mt-0.5">
          {t.status === "todo" && <Circle className="h-4 w-4 text-muted-foreground" />}
          {t.status === "in_progress" && <CircleDot className="h-4 w-4 text-primary" />}
          {t.status === "blocked" && <Ban className="h-4 w-4 text-amber-700" />}
          {t.status === "submitted" && <Inbox className="h-4 w-4 text-amber-600" />}
          {isComplete && <Check className="h-4 w-4 text-emerald-600" />}
        </div>
        <div className="flex-1 min-w-0">
          {!isComplete && (
            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
              {t.category && (
                <span className="max-w-full truncate rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                  {t.category}
                </span>
              )}
              <span className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider ${PRIORITY_STYLE[t.priority] ?? PRIORITY_STYLE.medium}`}>
                {t.priority}
              </span>
              {overdue && (
                <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] uppercase tracking-wider text-red-700 dark:text-red-400">
                  overdue
                </span>
              )}
              {t.source === "email" && (
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">from email</span>
              )}
            </div>
          )}
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className={`block w-full truncate text-left text-sm font-medium hover:underline ${isComplete ? "text-muted-foreground line-through" : "mt-1"}`}
            title={t.title}
          >
            {t.title}
          </button>
          {(hasDetails || t.feedback || isBlocked) && (
            <div className="mt-1 flex min-w-0 flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setExpanded(true)}
                className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
              >
                <ChevronDown className="h-3 w-3" />
                Details
              </button>
              {isComplete && t.feedback && (
                <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/25 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
                  <Sparkles className="h-3 w-3" />
                  {typeof t.feedback.score !== "undefined" ? `${t.feedback.score}/5` : "Reviewed"}
                </span>
              )}
            </div>
          )}
          {t.linked_stakeholder && !isComplete && (
            <div className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <StakeholderAvatar name={t.linked_stakeholder} size="sm" />
              {t.linked_stakeholder}
            </div>
          )}
          {isBlocked && (
            <div className="mt-2 flex items-center gap-1 text-[11px] font-medium text-amber-800 dark:text-amber-300">
              <Lock className="h-3 w-3" /> Blocked by {t.blocked_by.length}
            </div>
          )}
          {t.feedback && !isComplete && (
            <div className="mt-2 inline-flex max-w-full items-center gap-1 rounded-md border border-emerald-500/25 px-2 py-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
              <Sparkles className="h-3 w-3 shrink-0" />
              <span>Reviewed</span>
              {typeof t.feedback.score !== "undefined" && <span>· {t.feedback.score}/5</span>}
            </div>
          )}

          <div className="mt-2 flex flex-wrap gap-1.5">
            {t.linked_module_route && !isComplete && (
              <Link
                to={t.linked_module_route}
                className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] hover:bg-accent"
              >
                Open module <ArrowUpRight className="h-3 w-3" />
              </Link>
            )}
            {t.status === "todo" && (
              <button
                onClick={onStart}
                disabled={isBlocked}
                className="rounded-md border border-border px-2 py-1 text-[11px] hover:bg-accent disabled:opacity-40"
              >
                Start
              </button>
            )}
            {(t.status === "todo" || t.status === "in_progress") && (
              <button
                onClick={onSubmitClick}
                disabled={isBlocked || busy}
                className="rounded-md bg-primary px-2 py-1 text-[11px] font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-40"
              >
                Submit
              </button>
            )}
            {t.status === "submitted" && (
              <>
                <button
                  onClick={onApprove}
                  disabled={busy}
                  className="rounded-md bg-emerald-600 px-2 py-1 text-[11px] font-medium text-white hover:bg-emerald-700 disabled:opacity-40"
                >
                  {busy ? "Reviewing…" : "Close & review"}
                </button>
                <button
                  onClick={onRework}
                  disabled={busy}
                  className="rounded-md border border-border px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground disabled:opacity-40"
                >
                  Send back
                </button>
              </>
            )}
            {!["done", "approved", "submitted"].includes(t.status) && (
              <details className="relative">
                <summary className="cursor-pointer list-none rounded-md border border-border px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground">
                  <ShieldAlert className="mr-1 inline h-3 w-3" /> Escalate
                </summary>
                <div className="absolute z-10 mt-1 w-56 rounded-md border border-border bg-popover p-1 shadow-md">
                  {([
                    ["assign_lead", "Assign to functional lead"],
                    ["ask_pm", "Hand to Project Manager"],
                    ["escalate_sponsor", "Escalate to Sponsor"],
                    ["add_to_raid", "Add to RAID log"],
                  ] as const).map(([mode, label]) => (
                    <button
                      key={mode}
                      onClick={() => onEscalate(mode)}
                      className="block w-full rounded px-2 py-1 text-left text-[11px] hover:bg-accent"
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </details>
            )}
            <button
              onClick={onDelete}
              className="ml-auto text-muted-foreground hover:text-destructive"
              aria-label="Delete"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        {!isComplete && (
          <MentorTriggerButton
            task={{
              id: t.id,
              title: t.title,
              description: t.description,
              priority: t.priority,
              category: t.category,
              stakeholder: t.linked_stakeholder,
            }}
            className="ml-1 shrink-0"
          />
        )}
      </div>
      <Dialog open={expanded} onOpenChange={setExpanded}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="pr-6">{t.title}</DialogTitle>
            <DialogDescription className="flex flex-wrap gap-1.5 pt-1">
              {t.category && (
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase tracking-wider">{t.category}</span>
              )}
              <span className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider ${PRIORITY_STYLE[t.priority] ?? PRIORITY_STYLE.medium}`}>
                {t.priority}
              </span>
              {t.linked_stakeholder && <span className="text-[11px]">for {t.linked_stakeholder}</span>}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            {t.completion_action && (
              <div><span className="font-medium">Completion action:</span> <span className="text-muted-foreground">{t.completion_action}</span></div>
            )}
            {t.description && (
              <div className="whitespace-pre-wrap text-muted-foreground">{t.description}</div>
            )}
            {isBlocked && (
              <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-2 text-xs text-amber-800 dark:text-amber-300">
                <div className="flex items-center gap-1 font-medium"><Lock className="h-3 w-3" /> Blocked by</div>
                <ul className="mt-1 list-disc pl-4">
                  {t.blocked_by.map((d) => <li key={d.id}>{d.title}</li>)}
                </ul>
              </div>
            )}
            {t.feedback && (
              <div className="rounded-md border border-emerald-500/30 bg-emerald-500/5 p-3 text-xs">
                <div className="font-semibold text-emerald-700 dark:text-emerald-400">
                  <Sparkles className="mr-1 inline h-3 w-3" />
                  {t.feedback.skill} · {t.feedback.score}/5
                </div>
                <div className="mt-1"><span className="font-medium">Did well:</span> {t.feedback.did_well}</div>
                <div className="mt-1"><span className="font-medium">Improve:</span> {t.feedback.improve}</div>
                <div className="mt-1 italic text-muted-foreground">{t.feedback.real_world}</div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </li>
  );
}