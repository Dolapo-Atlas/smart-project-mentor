import { decodeSubmission, TEMPLATES } from "@/lib/templates";
import { CheckCircle2, AlertCircle, FileText } from "lucide-react";

function humanise(key: string) {
  const s = key.replace(/_/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function SubmissionView({ raw }: { raw: string }) {
  const payload = decodeSubmission(raw);
  if (!payload) return <div className="mt-1 whitespace-pre-wrap">{raw}</div>;
  if (payload.kind === "free_text") return <div className="mt-1 whitespace-pre-wrap">{payload.text}</div>;

  const def = payload.template ? TEMPLATES[payload.template] : undefined;
  const readiness = payload.readiness;
  const gaps = readiness?.checks?.filter((c: any) => !c.ok) ?? [];

  return (
    <div className="mt-2 space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <FileText className="h-3.5 w-3.5" />
        <span className="font-medium text-foreground">
          {payload.kind === "upload" ? payload.document_title : def?.label ?? "Atlas template"}
        </span>
        {readiness && (
          <span className="rounded-full border border-border px-2 py-0.5">
            Readiness {readiness.score}/100
          </span>
        )}
      </div>

      {payload.kind === "template" && (
        <dl className="space-y-3">
          {(def?.fields.map((f) => ({ key: f.key, label: f.label })) ??
            Object.keys(payload.values).map((k) => ({ key: k, label: humanise(k) })))
            .filter((f) => payload.values[f.key]?.trim())
            .map((f) => (
              <div key={f.key}>
                <dt className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{f.label}</dt>
                <dd className="mt-0.5 whitespace-pre-wrap leading-relaxed">
                  {f.key === "rag" ? payload.values[f.key].toUpperCase() : payload.values[f.key]}
                </dd>
              </div>
            ))}
        </dl>
      )}

      {payload.kind === "upload" && payload.note && (
        <p className="whitespace-pre-wrap">{payload.note}</p>
      )}

      {gaps.length > 0 && (
        <div className="rounded-md border border-border bg-muted/40 p-3">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Could be stronger</div>
          <ul className="mt-1 space-y-1">
            {gaps.map((c: any) => (
              <li key={c.label} className="flex gap-2 text-xs">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span><span className="font-medium">{c.label}</span>{c.hint ? ` — ${c.hint}` : ""}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {readiness && gaps.length === 0 && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <CheckCircle2 className="h-3.5 w-3.5" /> All readiness checks passed
        </div>
      )}
    </div>
  );
}
