import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { getNextAction } from "@/lib/time.functions";
import { ArrowRight, Sparkles } from "lucide-react";

const PHASE_LABEL: Record<string, string> = {
  initiation: "Initiation",
  planning: "Planning",
  execution: "Execution",
  monitoring: "Monitoring & Control",
  "go-live": "Go-Live",
  closure: "Closure",
};

export function WhatsNextPanel() {
  const fetchNext = useServerFn(getNextAction);
  const { data } = useQuery({ queryKey: ["next-action"], queryFn: () => fetchNext() });

  if (!data) {
    return (
      <section className="rounded-lg border border-border bg-card p-5">
        <div className="text-sm text-muted-foreground">Loading recommendation…</div>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-primary/40 bg-primary/5 p-5">
      <div className="flex items-start gap-4">
        <div className="rounded-md bg-primary/15 p-2 text-primary">
          <Sparkles className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.18em] text-primary/80">
            <span>What's next</span>
            <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] normal-case tracking-normal text-primary">
              {PHASE_LABEL[data.phase] ?? data.phase}
            </span>
            <span className="text-muted-foreground/80">
              Day {data.day} · Week {data.week}
            </span>
            {data.blockerCount > 0 ? (
              <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] normal-case tracking-normal text-amber-700 dark:text-amber-400">
                {data.blockerCount} open
              </span>
            ) : null}
          </div>
          <div className="mt-1 font-display text-lg font-medium">{data.action.title}</div>
          <p className="mt-1 text-sm text-muted-foreground">{data.action.reason}</p>
        </div>
        <Link
          to={data.action.to}
          className="shrink-0 inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          {data.action.cta}
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </section>
  );
}