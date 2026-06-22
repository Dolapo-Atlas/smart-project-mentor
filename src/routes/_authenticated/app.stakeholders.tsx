import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { StakeholderAvatar } from "@/components/stakeholder-avatar";
import { useStakeholders, StakeholderProfileDialog } from "@/components/stakeholder-card";

export const Route = createFileRoute("/_authenticated/app/stakeholders")({
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Stakeholders</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your working relationships across the Digital Care Records programme. Click anyone to log concerns and notes.
        </p>
      </div>

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