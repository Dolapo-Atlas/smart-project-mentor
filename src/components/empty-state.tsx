import { type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { motion, fadeUp } from "@/components/motion/primitives";
import type { LucideIcon } from "lucide-react";

type CTA = {
  label: string;
  to?: string;
  onClick?: () => void;
};

/**
 * Atlas empty state — decorative flat-geometric composition (navy / orange
 * / cream), warm mentor-voice copy, and an optional call to action.
 * Used across modules whenever a list is empty. Presentation only — no
 * business logic here.
 */
export function EmptyState({
  icon: Icon,
  title,
  body,
  cta,
  compact = false,
  className,
  extra,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
  cta?: CTA;
  compact?: boolean;
  className?: string;
  extra?: ReactNode;
}) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={fadeUp}
      className={
        "relative overflow-hidden rounded-2xl border border-border bg-card px-6 py-10 text-center shadow-sm " +
        (compact ? "py-8 " : "py-14 ") +
        (className ?? "")
      }
    >
      {/* decorative flat-geometric composition */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-16 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full bg-accent-orange/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-24 w-24 translate-x-1/3 translate-y-1/3 rounded-full bg-navy/5 blur-2xl" />
        <svg
          viewBox="0 0 200 60"
          className="absolute inset-x-0 -bottom-2 mx-auto h-14 w-64 text-navy/5"
          fill="currentColor"
        >
          <circle cx="20" cy="40" r="6" />
          <circle cx="60" cy="30" r="10" />
          <rect x="90" y="25" width="24" height="24" rx="4" />
          <circle cx="140" cy="35" r="8" />
          <rect x="160" y="30" width="20" height="20" rx="10" />
        </svg>
      </div>

      <div className="relative mx-auto flex max-w-md flex-col items-center gap-3">
        <motion.div
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 220, damping: 18, delay: 0.05 }}
          className="flex h-14 w-14 items-center justify-center rounded-2xl border border-accent-orange/30 bg-accent-orange/10 text-accent-orange shadow-sm"
        >
          <Icon className="h-6 w-6" />
        </motion.div>
        <h3 className="font-display text-lg font-semibold tracking-tight text-foreground">
          {title}
        </h3>
        <p className="max-w-sm text-sm text-muted-foreground">{body}</p>
        {extra}
        {cta ? (
          <div className="pt-2">
            {cta.to ? (
              <Button asChild size="sm">
                <Link to={cta.to}>{cta.label}</Link>
              </Button>
            ) : (
              <Button size="sm" onClick={cta.onClick}>
                {cta.label}
              </Button>
            )}
          </div>
        ) : null}
      </div>
    </motion.div>
  );
}