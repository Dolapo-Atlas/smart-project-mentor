import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listTasksRich } from "@/lib/tasks.functions";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ArrowRight, Lock } from "lucide-react";
import { TaskStateRibbon } from "@/components/insights/insight-ribbon";
import { RationaleChip } from "@/components/insights/rationale-chip";
import { ResolutionPanel, stripResolutionMarker } from "@/components/insights/resolution-panel";
import { motion, fadeUp, stagger } from "@/components/motion/primitives";
import { AnimatePresence } from "framer-motion";

type Task = {
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
  source?: string | null;
  source_ref?: string | null;
  blocked_by: { id: string; title: string }[];
};

const COLUMNS: Array<{ key: string; label: string; statuses: string[]; tone: string }> = [
  { key: "todo", label: "To do", statuses: ["todo", "blocked"], tone: "text-navy" },
  { key: "in_progress", label: "In progress", statuses: ["in_progress"], tone: "text-accent-orange" },
  { key: "pending", label: "Pending review", statuses: ["submitted"], tone: "text-warning-foreground" },
  { key: "completed", label: "Completed", statuses: ["done", "approved", "completed", "closed"], tone: "text-success" },
];

const PRIORITY_DOT: Record<string, string> = {
  critical: "bg-destructive",
  high: "bg-accent-orange",
  medium: "bg-navy",
  low: "bg-muted-foreground/50",
};

// Required = seeded onboarding tasks that drive phase progression.
// Everything else (email, change_request, manual) is optional / supporting.
function isRequired(t: { source?: string | null }) {
  return t.source === "onboarding";
}

export function TaskBoard() {
  const fetchTasks = useServerFn(listTasksRich);
  const { data } = useQuery<Task[]>({
    queryKey: ["tasks"],
    queryFn: () => fetchTasks() as Promise<Task[]>,
  });
  const [selected, setSelected] = useState<Task | null>(null);

  const grouped = useMemo(() => {
    const rows = data ?? [];
    return COLUMNS.map((c) => ({
      ...c,
      items: rows.filter((r) => c.statuses.includes(r.status)),
    }));
  }, [data]);

  return (
    <>
      <section className="rounded-2xl border border-border bg-card p-4 shadow-sm md:p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-lg font-semibold">Task board</h2>
            <div className="mt-1 flex items-center gap-3 text-[10px] uppercase tracking-wider text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-accent-orange" />
                Required — moves the phase forward
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50" />
                Optional — supporting work
              </span>
            </div>
          </div>
          <Link to="/app/tasks" className="text-xs font-medium text-primary hover:underline">
            Open full board →
          </Link>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {grouped.map((col) => (
            <div key={col.key} className="rounded-xl border border-border bg-background/60 p-3">
              <div className="flex items-center justify-between">
                <div className={`text-[11px] font-semibold uppercase tracking-wider ${col.tone}`}>
                  {col.label}
                </div>
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                  {col.items.length}
                </span>
              </div>
              <ul className="mt-3 space-y-2">
                {col.items.length === 0 && (
                  <li className="rounded-md border border-dashed border-border/60 p-3 text-center text-[11px] text-muted-foreground">
                    Empty
                  </li>
                )}
                <AnimatePresence initial={false}>
                {col.items.slice(0, 6).map((t) => {
                  const blocked = t.blocked_by?.length > 0;
                  return (
                    <motion.li
                      key={t.id}
                      layout
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <button
                        type="button"
                        onClick={() => setSelected(t)}
                        className={`hover-lift w-full rounded-md border bg-card p-3 text-left hover:border-primary/40 ${
                          isRequired(t)
                            ? "border-accent-orange/50 ring-1 ring-accent-orange/20"
                            : "border-border"
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <span
                            className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                              PRIORITY_DOT[t.priority] ?? PRIORITY_DOT.medium
                            }`}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start gap-1.5">
                              {isRequired(t) && (
                                <span className="mt-0.5 shrink-0 rounded-sm bg-accent-orange/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-accent-orange">
                                  Required
                                </span>
                              )}
                              <div className="line-clamp-2 text-sm font-medium">{t.title}</div>
                            </div>
                            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
                              {t.category && (
                                <span className="rounded-full bg-muted px-1.5 py-0.5 uppercase tracking-wider">
                                  {t.category}
                                </span>
                              )}
                              {t.linked_stakeholder && <span>· {t.linked_stakeholder}</span>}
                              {blocked && (
                                <span className="inline-flex items-center gap-1 text-muted-foreground/80">
                                  <Lock className="h-2.5 w-2.5" /> blocked
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </button>
                    </motion.li>
                  );
                })}
                </AnimatePresence>
                {col.items.length > 6 && (
                  <li className="pt-1 text-center text-[11px] text-muted-foreground">
                    +{col.items.length - 6} more
                  </li>
                )}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-lg">
          {selected && (
            <>
              <SheetHeader>
                <div className="flex flex-wrap items-center gap-2">
                  {isRequired(selected) && (
                    <span className="rounded-sm bg-accent-orange/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent-orange">
                      Required
                    </span>
                  )}
                  {selected.category && (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                      {selected.category}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-2 py-0.5 text-[10px] uppercase tracking-wider">
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        PRIORITY_DOT[selected.priority] ?? PRIORITY_DOT.medium
                      }`}
                    />
                    {selected.priority}
                  </span>
                </div>
                <SheetTitle className="mt-2 font-display text-2xl">{selected.title}</SheetTitle>
                {selected.completion_action && (
                  <SheetDescription>→ {selected.completion_action}</SheetDescription>
                )}
              </SheetHeader>

              <div className="mt-6 space-y-4 text-sm">
                <TaskStateRibbon status={selected.status} description={selected.description} />
                {selected.description?.includes("[[RESOLUTION_JSON]]") && (
                  <ResolutionPanel description={selected.description} />
                )}
                {selected.description && (
                  <div>
                    <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                      Detail
                    </div>
                    <p className="mt-1 whitespace-pre-wrap">
                      {stripResolutionMarker(selected.description)}
                    </p>
                  </div>
                )}
                {selected.linked_stakeholder && (
                  <div>
                    <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                      Stakeholder
                    </div>
                    <p className="mt-1">{selected.linked_stakeholder}</p>
                  </div>
                )}
                {selected.blocked_by?.length > 0 && (
                  <div className="rounded-md border border-border bg-muted/40 p-3">
                    <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                      Blocked by
                    </div>
                    <ul className="mt-1 list-disc pl-4">
                      {selected.blocked_by.map((b) => (
                        <li key={b.id}>{b.title}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {selected.source === "change_request" && selected.source_ref && (
                  <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
                    <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                      Source change request
                    </div>
                    <Link
                      to="/app/changes"
                      search={{ cr: selected.source_ref } as any}
                      className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                      onClick={() => setSelected(null)}
                    >
                      View CR <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                )}
              </div>

              <div className="mt-8">
                <Button asChild size="lg" className="w-full">
                  <Link
                    to={selected.linked_module_route ?? "/app/tasks"}
                    onClick={() => setSelected(null)}
                  >
                    Open in module
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <RationaleChip
                  insight={
                    (selected.description ?? "").includes("[Resolution]")
                      ? "task.verify_resolution"
                      : selected.status === "blocked"
                        ? "task.escalate"
                        : "task.submit"
                  }
                  className="mt-3"
                />
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}