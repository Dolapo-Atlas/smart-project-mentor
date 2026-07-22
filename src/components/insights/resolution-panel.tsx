import { CheckCircle2, ClipboardCheck, RotateCcw } from "lucide-react";

type Parsed = { owner: string; did: string[]; verify: string[] } | null;

function parse(description?: string | null): Parsed {
  if (!description) return null;
  const m = description.match(/\[\[RESOLUTION_JSON\]\]([\s\S]*?)\[\[\/RESOLUTION_JSON\]\]/);
  if (!m) return null;
  try {
    const raw = JSON.parse(m[1]);
    if (!raw || typeof raw !== "object") return null;
    return {
      owner: String(raw.owner ?? "Escalation owner"),
      did: Array.isArray(raw.did) ? raw.did.map(String) : [],
      verify: Array.isArray(raw.verify) ? raw.verify.map(String) : [],
    };
  } catch {
    return null;
  }
}

/**
 * Renders a structured "Resolution from <owner>" panel with two lists:
 *  - What they did (so the user knows what changed)
 *  - What to verify (so "verify resolution" is concrete, not vague)
 *
 * Reads the [[RESOLUTION_JSON]]…[[/RESOLUTION_JSON]] block that the sim
 * appends when an escalated task comes back. Silent no-op otherwise.
 */
export function ResolutionPanel({
  description,
  className = "",
}: {
  description?: string | null;
  className?: string;
}) {
  const parsed = parse(description);
  if (!parsed) return null;
  return (
    <div
      className={`rounded-md border border-emerald-500/40 bg-emerald-500/5 p-3 text-sm ${className}`}
      role="note"
    >
      <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-200">
        <RotateCcw className="h-3.5 w-3.5" />
        <span className="text-[11px] font-semibold uppercase tracking-wider">
          Resolution from {parsed.owner}
        </span>
      </div>

      {parsed.did.length > 0 && (
        <div className="mt-2">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
            <CheckCircle2 className="h-3 w-3" /> What they did
          </div>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-[13px] leading-snug">
            {parsed.did.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        </div>
      )}

      {parsed.verify.length > 0 && (
        <div className="mt-3">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
            <ClipboardCheck className="h-3 w-3" /> Verify before closing
          </div>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-[13px] leading-snug">
            {parsed.verify.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        </div>
      )}

      <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
        You're not grading their work — you're confirming it fits the project. The sponsor still expects
        <em> you</em> to deliver, so a quick check protects the outcome.
      </p>
    </div>
  );
}

/** Utility: strip the raw JSON marker so it never renders in plain description views. */
export function stripResolutionMarker(description?: string | null): string {
  if (!description) return "";
  return description.replace(/\n?\[\[RESOLUTION_JSON\]\][\s\S]*?\[\[\/RESOLUTION_JSON\]\]/g, "").trim();
}