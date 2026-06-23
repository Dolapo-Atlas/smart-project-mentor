import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getStakeholders, repairStakeholderRelationship, updateStakeholder } from "@/lib/pm.functions";
import { StakeholderAvatar } from "@/components/stakeholder-avatar";
import { HoverCard, HoverCardTrigger, HoverCardContent } from "@/components/ui/hover-card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { MailCheck, ThumbsUp, ThumbsDown, Plus, X } from "lucide-react";
import { toast } from "sonner";

type Stakeholder = {
  name: string;
  role: string;
  type: string;
  sentiment: number;
  concerns: string[];
  notes: string;
  interaction_count: number;
  last_interaction: string | null;
};

function sentimentLabel(s: number) {
  if (s >= 60) return { label: "Champion", color: "text-emerald-600" };
  if (s >= 20) return { label: "Supportive", color: "text-emerald-500" };
  if (s >= -19) return { label: "Neutral", color: "text-muted-foreground" };
  if (s >= -59) return { label: "Frustrated", color: "text-orange-500" };
  return { label: "Hostile", color: "text-red-600" };
}

function recoveryPlaybook(name: string) {
  if (name === "Priya Anand") {
    return {
      title: "Priya needs numbers, not another generic email",
      body: "Acknowledge that finance is protecting the budget. Reply with forecast vs actuals, vendor cost exposure, approval route, and the specific decision you need from her.",
      action: "Send Priya the finance recovery note",
    };
  }

  return {
    title: "Reset the relationship",
    body: "Stop sending repeated updates. Acknowledge the concern, name the decision needed, and ask what evidence would rebuild confidence.",
    action: `Send ${name} a recovery note`,
  };
}

function SentimentBar({ value }: { value: number }) {
  // -100..100 → 0..100
  const pct = ((value + 100) / 200) * 100;
  return (
    <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
      <div className="absolute inset-y-0 left-1/2 w-px bg-border" />
      <div
        className={`h-full transition-all ${value >= 0 ? "bg-emerald-500" : "bg-red-500"}`}
        style={{
          marginLeft: value >= 0 ? "50%" : `${pct}%`,
          width: `${Math.abs(value) / 2}%`,
        }}
      />
    </div>
  );
}

export function useStakeholders() {
  const fn = useServerFn(getStakeholders);
  return useQuery({ queryKey: ["stakeholders"], queryFn: () => fn() });
}

export function StakeholderHoverAvatar({
  name,
  size = "sm",
  className,
}: {
  name: string;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const { data } = useStakeholders();
  const s = data?.find((x) => x.name === name);

  return (
    <>
      <HoverCard openDelay={150}>
        <HoverCardTrigger asChild>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className={`cursor-pointer rounded-full transition hover:opacity-80 ${className ?? ""}`}
            aria-label={`Open ${name} profile`}
          >
            <StakeholderAvatar name={name} size={size} />
          </button>
        </HoverCardTrigger>
        <HoverCardContent className="w-72">
          <StakeholderQuickPreview name={name} stakeholder={s} />
        </HoverCardContent>
      </HoverCard>
      <StakeholderProfileDialog name={name} open={open} onOpenChange={setOpen} />
    </>
  );
}

function StakeholderQuickPreview({ name, stakeholder }: { name: string; stakeholder?: Stakeholder }) {
  const role = stakeholder?.role ?? "";
  const sentiment = stakeholder?.sentiment ?? 0;
  const sl = sentimentLabel(sentiment);
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <StakeholderAvatar name={name} size="md" />
        <div className="min-w-0">
          <div className="truncate font-semibold">{name}</div>
          <div className="truncate text-xs text-muted-foreground">{role}</div>
        </div>
      </div>
      <div>
        <div className="mb-1 flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Sentiment</span>
          <span className={`font-medium ${sl.color}`}>{sl.label} ({sentiment > 0 ? "+" : ""}{sentiment})</span>
        </div>
        <SentimentBar value={sentiment} />
      </div>
      {stakeholder?.concerns?.length ? (
        <div>
          <div className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">Top concerns</div>
          <ul className="space-y-1 text-xs">
            {stakeholder.concerns.slice(0, 3).map((c) => (
              <li key={c} className="truncate">• {c}</li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="text-xs text-muted-foreground">No concerns logged yet.</div>
      )}
      <div className="text-[11px] text-muted-foreground">
        {stakeholder?.interaction_count ?? 0} interactions · click avatar for full profile
      </div>
    </div>
  );
}

export function StakeholderProfileDialog({
  name,
  open,
  onOpenChange,
}: {
  name: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { data } = useStakeholders();
  const s = data?.find((x) => x.name === name);
  const qc = useQueryClient();
  const updateFn = useServerFn(updateStakeholder);
  const repairFn = useServerFn(repairStakeholderRelationship);
  type UpdateInput = {
    name: string;
    sentimentDelta?: number;
    addConcern?: string;
    removeConcern?: string;
    notes?: string;
    bumpInteraction?: boolean;
  };
  const update = useMutation({
    mutationFn: (input: UpdateInput) => updateFn({ data: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["stakeholders"] }),
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Update failed"),
  });
  const repair = useMutation({
    mutationFn: () => repairFn({ data: { name } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stakeholders"] });
      qc.invalidateQueries({ queryKey: ["comms"] });
      qc.invalidateQueries({ queryKey: ["inbox"] });
      qc.invalidateQueries({ queryKey: ["overview"] });
      qc.invalidateQueries({ queryKey: ["next-action"] });
      toast.success(`${name} has a clear recovery note to respond to.`);
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Recovery note failed"),
  });

  const [newConcern, setNewConcern] = useState("");
  const [notesDraft, setNotesDraft] = useState<string | null>(null);

  const sentiment = s?.sentiment ?? 0;
  const sl = sentimentLabel(sentiment);
  const playbook = recoveryPlaybook(name);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <StakeholderAvatar name={name} size="lg" />
            <div className="min-w-0">
              <DialogTitle className="truncate">{name}</DialogTitle>
              <DialogDescription className="truncate">{s?.role ?? ""}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5">
          <div>
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Relationship</span>
              <span className={`font-medium ${sl.color}`}>{sl.label} ({sentiment > 0 ? "+" : ""}{sentiment})</span>
            </div>
            <SentimentBar value={sentiment} />
            <div className="mt-2 flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => update.mutate({ name, sentimentDelta: -5 })}
                disabled={update.isPending}
              >
                <ThumbsDown className="h-3.5 w-3.5" /> -5
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => update.mutate({ name, sentimentDelta: 5 })}
                disabled={update.isPending}
              >
                <ThumbsUp className="h-3.5 w-3.5" /> +5
              </Button>
              <div className="ml-auto text-xs text-muted-foreground self-center">
                {s?.interaction_count ?? 0} interactions
              </div>
            </div>
          </div>

          {sentiment < -20 && (
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
              <div className="flex items-start gap-3">
                <div className="rounded-md bg-primary/10 p-2 text-primary">
                  <MailCheck className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold">{playbook.title}</div>
                  <p className="mt-1 text-sm text-muted-foreground">{playbook.body}</p>
                  <Button
                    size="sm"
                    className="mt-3"
                    onClick={() => repair.mutate()}
                    disabled={repair.isPending}
                  >
                    <MailCheck className="h-3.5 w-3.5" />
                    {repair.isPending ? "Sending recovery note…" : playbook.action}
                  </Button>
                </div>
              </div>
            </div>
          )}

          <div>
            <div className="mb-2 text-sm font-medium">Concerns</div>
            <div className="space-y-1.5">
              {(s?.concerns ?? []).map((c) => (
                <div key={c} className="flex items-center gap-2 rounded-md border border-border px-2.5 py-1.5 text-sm">
                  <span className="flex-1 break-words">{c}</span>
                  <button
                    type="button"
                    onClick={() => update.mutate({ name, removeConcern: c })}
                    className="text-muted-foreground hover:text-foreground"
                    aria-label="Remove concern"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              {!s?.concerns?.length && (
                <div className="text-xs text-muted-foreground">No concerns logged.</div>
              )}
            </div>
            <div className="mt-2 flex gap-2">
              <Input
                value={newConcern}
                onChange={(e) => setNewConcern(e.target.value)}
                placeholder="e.g. Worried about go-live timeline"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newConcern.trim()) {
                    update.mutate({ name, addConcern: newConcern.trim() });
                    setNewConcern("");
                  }
                }}
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  if (!newConcern.trim()) return;
                  update.mutate({ name, addConcern: newConcern.trim() });
                  setNewConcern("");
                }}
              >
                <Plus className="h-3.5 w-3.5" /> Add
              </Button>
            </div>
          </div>

          <div>
            <div className="mb-2 text-sm font-medium">Private notes</div>
            <Textarea
              rows={3}
              value={notesDraft ?? s?.notes ?? ""}
              onChange={(e) => setNotesDraft(e.target.value)}
              placeholder="Your thoughts on how to manage this stakeholder…"
            />
            <div className="mt-2 flex justify-end">
              <Button
                size="sm"
                onClick={() => {
                  update.mutate({ name, notes: notesDraft ?? s?.notes ?? "" });
                  setNotesDraft(null);
                }}
                disabled={update.isPending || notesDraft === null}
              >
                Save notes
              </Button>
            </div>
          </div>

          {s?.last_interaction && (
            <div className="text-[11px] text-muted-foreground">
              Last interaction: {new Date(s.last_interaction).toLocaleString()}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}