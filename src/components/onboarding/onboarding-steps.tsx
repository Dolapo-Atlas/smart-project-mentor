import { Check } from "lucide-react";

export const ONBOARDING_STEPS = [
  "Your details",
  "Orientation",
  "Your project",
] as const;

/**
 * Purely presentational "Step N of 3" strip shared by the three screens a new
 * learner passes through before their first day. No state is read or written.
 */
export function OnboardingSteps({ current }: { current: 1 | 2 | 3 }) {
  return (
    <nav aria-label="Onboarding progress" className="flex flex-wrap items-center gap-3">
      <span className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
        Step {current} of {ONBOARDING_STEPS.length}
      </span>
      <ol className="flex flex-wrap items-center gap-2">
        {ONBOARDING_STEPS.map((label, i) => {
          const index = i + 1;
          const done = index < current;
          const active = index === current;
          return (
            <li key={label} className="flex items-center gap-2">
              <span
                className={[
                  "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition",
                  active
                    ? "border-accent-orange/50 bg-accent-orange/10 font-medium text-foreground"
                    : done
                      ? "border-border bg-muted/50 text-muted-foreground"
                      : "border-dashed border-border text-muted-foreground/70",
                ].join(" ")}
                aria-current={active ? "step" : undefined}
              >
                {done ? <Check className="h-3 w-3 text-emerald-600" /> : null}
                {label}
              </span>
              {index < ONBOARDING_STEPS.length && (
                <span aria-hidden className="h-px w-4 bg-border" />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}