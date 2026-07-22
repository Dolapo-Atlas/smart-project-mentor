import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import confetti from "canvas-confetti";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Mail,
  Flag,
  Sparkles,
  ArrowRight,
  Heart,
  AlertTriangle,
  ListChecks,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { motion, fadeUp, stagger, CountUp } from "@/components/motion/primitives";
import { listWhatsNext } from "@/lib/tasks.functions";

export type DayInReviewSummary = {
  days: number;
  fromDay: number;
  toDay: number;
  phase: string;
  phaseChanged: boolean;
  healthChange: { from: string; to: string } | null;
  sentimentDeltas: Record<string, number>;
  reputationDelta: number;
  newEmails: string[];
  beats: { at: string; beat: string }[];
};

const SLIDE_LABEL = ["What changed", "Wins & watch-outs", "What's next"];

function fireConfetti() {
  // Navy + orange burst — matches Atlas palette.
  const end = Date.now() + 700;
  const colors = ["#F97316", "#0B132B", "#FFF8EF"];
  (function frame() {
    confetti({
      particleCount: 4,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.9 },
      colors,
    });
    confetti({
      particleCount: 4,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.9 },
      colors,
    });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();
}

export function DayInReview({
  open,
  summary,
  onOpenChange,
}: {
  open: boolean;
  summary: DayInReviewSummary | null;
  onOpenChange: (v: boolean) => void;
}) {
  const [slide, setSlide] = useState(0);
  const fetchNext = useServerFn(listWhatsNext);
  const { data: whatsNext } = useQuery({
    queryKey: ["whats-next"],
    queryFn: () => fetchNext(),
    enabled: open,
  });

  useEffect(() => {
    if (open) setSlide(0);
  }, [open, summary]);

  useEffect(() => {
    if (!open || !summary) return;
    if (summary.phaseChanged) {
      // Small celebration when a phase gate cleared.
      const t = window.setTimeout(fireConfetti, 220);
      return () => window.clearTimeout(t);
    }
  }, [open, summary]);

  const sentimentEntries = useMemo(
    () =>
      Object.entries(summary?.sentimentDeltas ?? {})
        .filter(([, v]) => v !== 0)
        .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])),
    [summary],
  );

  if (!summary) return null;

  const wins = summary.beats.filter(
    (b) => /improved|advanced|under control|resolution/i.test(b.beat),
  );
  const watchOuts = summary.beats.filter(
    (b) =>
      !/improved|advanced|under control|resolution/i.test(b.beat) &&
      /degrad|unanswered|open|missed|frustrat/i.test(b.beat),
  );

  const total = 3;
  const isLast = slide === total - 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg overflow-hidden p-0">
        <div className="relative bg-navy px-6 pt-6 pb-4 text-navy-foreground">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-accent-orange/25 blur-3xl"
          />
          <div className="relative flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.18em] text-white/60">
            <Sparkles className="h-3.5 w-3.5" />
            Day in review
          </div>
          <DialogTitle className="relative mt-2 font-display text-2xl font-semibold text-white">
            {summary.phaseChanged
              ? `Phase cleared — welcome to ${summary.phase}.`
              : `Day ${summary.fromDay} → Day ${summary.toDay}`}
          </DialogTitle>
          <DialogDescription className="relative mt-1 text-sm text-white/70">
            {SLIDE_LABEL[slide]}
          </DialogDescription>
          <div className="relative mt-4 flex gap-1.5">
            {Array.from({ length: total }).map((_, i) => (
              <div
                key={i}
                className={
                  "h-1 flex-1 rounded-full transition-colors " +
                  (i <= slide ? "bg-accent-orange" : "bg-white/15")
                }
              />
            ))}
          </div>
        </div>

        <div className="min-h-[260px] px-6 py-5">
          {slide === 0 ? (
            <motion.div
              initial="hidden"
              animate="visible"
              variants={stagger}
              className="grid grid-cols-2 gap-3"
            >
              <StatTile
                icon={Mail}
                label="New emails"
                value={summary.newEmails.length}
                accent="orange"
              />
              <StatTile
                icon={ListChecks}
                label="Story beats"
                value={summary.beats.length}
                accent="navy"
              />
              <StatTile
                icon={
                  summary.reputationDelta >= 0 ? TrendingUp : TrendingDown
                }
                label="Reputation"
                value={summary.reputationDelta}
                signed
                accent={summary.reputationDelta >= 0 ? "green" : "red"}
              />
              <StatTile
                icon={Flag}
                label={summary.phaseChanged ? "Phase" : "Days elapsed"}
                value={summary.phaseChanged ? 1 : summary.days}
                suffix={summary.phaseChanged ? "  cleared" : ""}
                accent={summary.phaseChanged ? "green" : "navy"}
              />

              {summary.healthChange ? (
                <div className="col-span-2 rounded-xl border border-border bg-background/50 px-4 py-3 text-sm">
                  <span className="text-muted-foreground">Health moved </span>
                  <span className="font-medium text-foreground">
                    {summary.healthChange.from} → {summary.healthChange.to}
                  </span>
                </div>
              ) : null}
            </motion.div>
          ) : slide === 1 ? (
            <motion.div
              initial="hidden"
              animate="visible"
              variants={stagger}
              className="space-y-3"
            >
              {wins.length === 0 && watchOuts.length === 0 && (
                <p className="rounded-md border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
                  A quiet passage. No dramatic swings — sometimes that's the win.
                </p>
              )}
              {wins.map((b, i) => (
                <motion.div
                  key={`w${i}`}
                  variants={fadeUp}
                  className="flex items-start gap-3 rounded-md border border-success/30 bg-success/5 px-3 py-2 text-sm"
                >
                  <Heart className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                  <span>{b.beat}</span>
                </motion.div>
              ))}
              {watchOuts.map((b, i) => (
                <motion.div
                  key={`x${i}`}
                  variants={fadeUp}
                  className="flex items-start gap-3 rounded-md border border-amber-500/40 bg-amber-500/5 px-3 py-2 text-sm"
                >
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                  <span>{b.beat}</span>
                </motion.div>
              ))}
              {sentimentEntries.length > 0 && (
                <div className="rounded-md border border-border bg-muted/30 p-3 text-xs">
                  <div className="mb-2 font-medium uppercase tracking-wider text-muted-foreground">
                    Sentiment shifts
                  </div>
                  <ul className="space-y-1">
                    {sentimentEntries.slice(0, 4).map(([name, delta]) => (
                      <li key={name} className="flex items-center justify-between">
                        <span>{name}</span>
                        <span
                          className={
                            "font-mono " +
                            (delta > 0 ? "text-success" : "text-destructive")
                          }
                        >
                          {delta > 0 ? "+" : ""}
                          {delta}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              initial="hidden"
              animate="visible"
              variants={stagger}
              className="space-y-2"
            >
              <p className="text-sm text-muted-foreground">
                Three moves that give you the most leverage right now.
              </p>
              {(whatsNext?.tasks ?? []).slice(0, 3).map((t: any) => (
                <motion.div key={t.id} variants={fadeUp}>
                  <Link
                    to={t.linked_module_route ?? "/app/tasks"}
                    onClick={() => onOpenChange(false)}
                    className="hover-lift group flex items-center justify-between gap-3 rounded-md border border-border bg-card px-3 py-2.5 text-sm"
                  >
                    <span className="min-w-0 flex-1 truncate">{t.title}</span>
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                  </Link>
                </motion.div>
              ))}
              {(whatsNext?.tasks ?? []).length === 0 && (
                <p className="rounded-md border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
                  Nothing pressing on the plan. Consider a status report or a stakeholder check-in.
                </p>
              )}
            </motion.div>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-border bg-muted/30 px-6 py-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => (slide > 0 ? setSlide(slide - 1) : onOpenChange(false))}
          >
            {slide > 0 ? "Back" : "Skip"}
          </Button>
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
            {slide + 1} / {total}
          </div>
          <Button
            size="sm"
            onClick={() => (isLast ? onOpenChange(false) : setSlide(slide + 1))}
          >
            {isLast ? "Back to work" : "Next"}
            <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
  suffix,
  signed,
  accent,
}: {
  icon: any;
  label: string;
  value: number;
  suffix?: string;
  signed?: boolean;
  accent: "orange" | "navy" | "green" | "red";
}) {
  const styles: Record<string, string> = {
    orange: "text-accent-orange border-accent-orange/30 bg-accent-orange/5",
    navy: "text-navy border-navy/20 bg-navy/[0.03]",
    green: "text-success border-success/30 bg-success/5",
    red: "text-destructive border-destructive/30 bg-destructive/5",
  };
  return (
    <motion.div
      variants={fadeUp}
      className={"rounded-xl border p-3 " + styles[accent]}
    >
      <div className="flex items-center justify-between">
        <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
        <Icon className="h-4 w-4" />
      </div>
      <div className="mt-2 font-display text-2xl font-semibold text-foreground">
        {signed && value > 0 ? "+" : ""}
        <CountUp value={value} />
        {suffix && <span className="ml-1 text-xs text-muted-foreground">{suffix}</span>}
      </div>
    </motion.div>
  );
}