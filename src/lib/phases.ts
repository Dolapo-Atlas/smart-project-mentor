// ============================================================================
// Atlas canonical simulation phase model — THE single source of truth.
// Every part of the app (clock, gates, analytics, progress, chapters, nav,
// results) must import from here. Do not re-declare phase lists elsewhere.
// ============================================================================

export const PHASE_KEYS = [
  "initiation",
  "planning",
  "execution",
  "monitoring",
  "go-live",
  "closure",
] as const;

export type PhaseKey = (typeof PHASE_KEYS)[number];

export const PHASE_LABELS: Record<PhaseKey, string> = {
  initiation: "Initiation",
  planning: "Planning",
  execution: "Execution",
  monitoring: "Monitoring & Control",
  "go-live": "Go Live",
  closure: "Closure",
};

/** The governance gate that closes each phase. */
export const GATE_LABELS: Record<PhaseKey, string> = {
  initiation: "Initiation Gate",
  planning: "Planning Gate",
  execution: "Execution Gate",
  monitoring: "Monitoring Gate",
  "go-live": "Go-Live Gate",
  closure: "Closure / Sponsor Sign-Off",
};

/**
 * A phase readiness item must reach this percentage to count as delivered.
 * 80 = "submitted / delivered"; 100 = "approved". We gate on delivered so a
 * learner is never soft-locked waiting on an AI review, but nothing below
 * delivered lets them through.
 */
export const PHASE_READY_THRESHOLD = 80;

export function isPhaseKey(value: unknown): value is PhaseKey {
  return typeof value === "string" && (PHASE_KEYS as readonly string[]).includes(value);
}

/**
 * Normalise a stored phase string. Returns null for unknown values and logs —
 * never silently defaults to Execution.
 */
export function normalisePhase(input?: string | null): PhaseKey | null {
  const k = (input ?? "").toLowerCase().trim();
  if (!k) return null;
  if (isPhaseKey(k)) return k;
  if (k.startsWith("init")) return "initiation";
  if (k.startsWith("plan")) return "planning";
  if (k.startsWith("exec") || k.startsWith("deliver")) return "execution";
  if (k.startsWith("mon") || k.startsWith("control")) return "monitoring";
  if (k.startsWith("go") || k.startsWith("live") || k.startsWith("launch")) return "go-live";
  if (k.startsWith("clos") || k.startsWith("hand")) return "closure";
  console.error(`[atlas:phases] unknown phase value "${input}" — refusing to guess`);
  return null;
}

/** Normalise, falling back to the first phase for display-only surfaces. */
export function phaseOrFirst(input?: string | null): PhaseKey {
  return normalisePhase(input) ?? "initiation";
}

export function phaseIndex(phase: PhaseKey): number {
  return PHASE_KEYS.indexOf(phase);
}

export function nextPhase(phase: PhaseKey): PhaseKey | null {
  const i = phaseIndex(phase);
  return i >= 0 && i < PHASE_KEYS.length - 1 ? PHASE_KEYS[i + 1] : null;
}

export function prevPhase(phase: PhaseKey): PhaseKey | null {
  const i = phaseIndex(phase);
  return i > 0 ? PHASE_KEYS[i - 1] : null;
}

export function phaseLabel(input?: string | null): string {
  const p = normalisePhase(input);
  return p ? PHASE_LABELS[p] : "Unknown phase";
}

export function isFinalPhase(phase: PhaseKey): boolean {
  return phase === "closure";
}

/** Phases at or before the given phase — useful for "already covered" checks. */
export function phasesUpTo(phase: PhaseKey): PhaseKey[] {
  return PHASE_KEYS.slice(0, phaseIndex(phase) + 1);
}
