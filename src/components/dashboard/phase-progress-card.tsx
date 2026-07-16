import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getPhaseProgress } from "@/lib/phase.functions";
import { ChevronDown } from "lucide-react";
import { useState } from "react";

export function PhaseProgressCard({ compact = false }: { compact?: boolean }) {
  const fetch = useServerFn(getPhaseProgress);
  const { data } = useQuery({
    queryKey: ["phase-progress"],
    queryFn: () => fetch(),
    refetchInterval: 20000,
  });
  const [open, setOpen] = useState(true);

  const overall = data?.overall ?? 0;
  const items = data?.items ?? [];
  const label = data?.phaseLabel ?? "Current phase";

  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.06] p-4 shadow-inner">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between text-left md:cursor-default"
        aria-expanded={open}
      >
        <div>
          <div className="text-[10px] font-medium uppercase tracking-[0.16em] text-white/60">
            Current phase
          </div>
          <div className="mt-0.5 font-display text-base text-white">{label}</div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-white/85">{overall}%</span>
          <ChevronDown
            className={`h-3.5 w-3.5 text-white/60 transition md:hidden ${open ? "rotate-180" : ""}`}
          />
        </div>
      </button>

      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/10 progress-smooth">
        <div
          className="h-full rounded-full bg-accent-orange transition-all duration-500"
          style={{ width: `${overall}%` }}
        />
      </div>

      {(open || !compact) && (
        <ul className="mt-4 space-y-2.5">
          {items.length === 0 ? (
            <li className="text-[11px] text-white/50">Loading progress…</li>
          ) : (
            items.map((it) => (
              <li key={it.key}>
                <Link
                  to={it.route}
                  className="group block rounded-md px-1.5 py-1 -mx-1.5 transition hover:bg-white/5"
                >
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="truncate text-white/85 group-hover:text-white">
                      {it.label}
                    </span>
                    <span className="ml-2 tabular-nums text-white/60 group-hover:text-white/90">
                      {it.pct}%
                    </span>
                  </div>
                  <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-accent-orange/85 transition-all duration-500"
                      style={{ width: `${it.pct}%` }}
                    />
                  </div>
                  {it.hint && (
                    <div className="mt-0.5 text-[10px] uppercase tracking-wider text-white/40">
                      {it.hint}
                    </div>
                  )}
                </Link>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}