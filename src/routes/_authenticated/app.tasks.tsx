import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listTasks, createTask, updateTaskStatus, deleteTask } from "@/lib/sim.functions";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check, Circle, CircleDot, Plus, Trash2, Inbox } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/tasks")({
  component: Tasks,
});

function Tasks() {
  const qc = useQueryClient();
  const fetchTasks = useServerFn(listTasks);
  const createFn = useServerFn(createTask);
  const updateFn = useServerFn(updateTaskStatus);
  const deleteFn = useServerFn(deleteTask);
  const { data: tasks } = useQuery({ queryKey: ["tasks"], queryFn: () => fetchTasks() });

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");

  const create = useMutation({
    mutationFn: () => createFn({ data: { title, description: description || undefined, priority } }),
    onSuccess: () => {
      setTitle("");
      setDescription("");
      setPriority("medium");
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["overview"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const update = useMutation({
    mutationFn: (v: { id: string; status: "todo" | "in_progress" | "submitted" | "done" }) => updateFn({ data: v }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["overview"] });
    },
  });

  const del = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const grouped = {
    todo: tasks?.filter((t) => t.status === "todo") ?? [],
    in_progress: tasks?.filter((t) => t.status === "in_progress") ?? [],
    submitted: tasks?.filter((t) => t.status === "submitted") ?? [],
    done: tasks?.filter((t) => t.status === "done") ?? [],
  };

  const columnLabels: Record<keyof typeof grouped, string> = {
    todo: "To Do",
    in_progress: "In Progress",
    submitted: "Submitted",
    done: "Completed",
  };

  return (
    <div className="space-y-8">
      <header>
        <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Coordination</div>
        <h1 className="font-display text-4xl font-medium">Task board</h1>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">
          Move work from To Do through In Progress, mark it Submitted when you upload to Documents,
          and Completed when the AI panel signs it off.
        </p>
        <div className="mt-4"><TimeControls compact /></div>
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
          <Select value={priority} onValueChange={(v) => setPriority(v as typeof priority)}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
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

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {(["todo", "in_progress", "submitted", "done"] as const).map((status) => (
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
                <li key={t.id} className="rounded-md border border-border bg-background p-3">
                  <div className="flex items-start gap-2">
                    <button
                      onClick={() => {
                        const cycle = { todo: "in_progress", in_progress: "submitted", submitted: "done", done: "todo" } as const;
                        const next = cycle[t.status as keyof typeof cycle] ?? "todo";
                        update.mutate({ id: t.id, status: next });
                      }}
                      className="mt-0.5"
                      aria-label="Cycle status"
                    >
                      {t.status === "todo" && <Circle className="h-4 w-4 text-muted-foreground" />}
                      {t.status === "in_progress" && <CircleDot className="h-4 w-4 text-primary" />}
                      {t.status === "submitted" && <Inbox className="h-4 w-4 text-amber-600" />}
                      {t.status === "done" && <Check className="h-4 w-4 text-emerald-600" />}
                    </button>
                    <div className="flex-1">
                      <div className={`text-sm font-medium ${t.status === "done" ? "line-through text-muted-foreground" : ""}`}>
                        {t.title}
                      </div>
                      {t.description && (
                        <div className="mt-1 text-xs text-muted-foreground">{t.description}</div>
                      )}
                      <div className="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">
                        {t.priority}
                      </div>
                    </div>
                    <button
                      onClick={() => del.mutate(t.id)}
                      className="text-muted-foreground hover:text-destructive"
                      aria-label="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}