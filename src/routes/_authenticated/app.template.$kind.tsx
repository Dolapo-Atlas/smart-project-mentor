import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { recordDocument, reviewDocument } from "@/lib/sim.functions";
import { TEMPLATES, TEMPLATE_WHY, type TemplateKind, evaluateGenericTemplate } from "@/lib/templates";
import { isPaywallError } from "@/lib/paywall";
import { WhyThisMatters } from "@/components/why-this-matters";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, CheckCircle2, Loader2, Save, Sparkles } from "lucide-react";
import { toast } from "sonner";
import {
  ExampleDialog,
  FirstTimeChoiceCard,
  GuidedCoachStrip,
  useFirstTimeMode,
} from "@/components/onboarding/first-time-task";
import { LockedModuleGate } from "@/components/dashboard/locked-module-gate";

export const Route = createFileRoute("/_authenticated/app/template/$kind")({
  component: TemplateFillRoute,
});

function TemplateFillRoute() {
  return (
    <LockedModuleGate>
      <TemplateFillPage />
    </LockedModuleGate>
  );
}

function TemplateFillPage() {
  const { kind } = useParams({ from: "/_authenticated/app/template/$kind" }) as { kind: string };
  const navigate = useNavigate();
  const qc = useQueryClient();
  const recordFn = useServerFn(recordDocument);
  const reviewFn = useServerFn(reviewDocument);

  const template = (TEMPLATES as Record<string, (typeof TEMPLATES)[TemplateKind] | undefined>)[kind];
  const draftKey = `atlas.template-draft.${kind}`;

  const [values, setValues] = useState<Record<string, string>>(() => {
    if (typeof window === "undefined") return {};
    try {
      const raw = localStorage.getItem(draftKey);
      return raw ? (JSON.parse(raw) as Record<string, string>) : {};
    } catch {
      return {};
    }
  });

  const firstTime = useFirstTimeMode(`template.${kind}`);
  const [exampleOpen, setExampleOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(draftKey, JSON.stringify(values));
    } catch {
      /* ignore quota */
    }
  }, [values, draftKey]);

  const readiness = useMemo(
    () => (template ? evaluateGenericTemplate(kind as TemplateKind, values) : null),
    [template, kind, values],
  );

  const submit = useMutation({
    mutationFn: async (opts: { requestReview: boolean }) => {
      if (!template) throw new Error("Unknown template");
      const md = compileMarkdown(template.label, template.fields, values);
      const doc = await recordFn({
        data: {
          title: template.label,
          storage_path: `template://${kind}/${Date.now()}`,
          content_excerpt: md,
          mime_type: "text/markdown",
          size_bytes: new Blob([md]).size,
          // Canonical deliverable identity — mirrors into project_artifacts.
          artifact_type: kind,
          payload: values,
        },
      });
      if (opts.requestReview && (doc as { id?: string }).id) {
        await reviewFn({ data: { document_id: (doc as { id: string }).id } }).catch(() => null);
      }
      return doc;
    },
    onSuccess: () => {
      toast.success("Saved to your Project Deliverables.");
      qc.invalidateQueries({ queryKey: ["documents"] });
      qc.invalidateQueries({ queryKey: ["deliverables"] });
      qc.invalidateQueries({ queryKey: ["phase-progress"] });
      qc.invalidateQueries({ queryKey: ["overview"] });
      try {
        localStorage.removeItem(draftKey);
      } catch {
        /* ignore */
      }
      navigate({ to: "/app" });
    },
    onError: (e) => {
      if (isPaywallError(e)) {
        toast.info("Your free preview is complete — unlock to keep going.");
        navigate({ to: "/app/unlock" });
        return;
      }
      toast.error(e instanceof Error ? e.message : "Save failed");
    },
  });

  if (!template) {
    return (
      <div className="mx-auto max-w-2xl py-12 text-center">
        <h1 className="font-display text-2xl">Template not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The template <code>{kind}</code> does not exist.
        </p>
        <Button asChild className="mt-6" variant="outline">
          <Link to="/app/templates">Browse templates</Link>
        </Button>
      </div>
    );
  }

  const setField = (k: string, v: string) => setValues((prev) => ({ ...prev, [k]: v }));
  const meter = readiness?.score ?? 0;
  const statusLabel =
    readiness?.status === "ready"
      ? "Ready to submit"
      : readiness?.status === "needs_improvement"
        ? "Needs improvement"
        : "Not ready";
  const statusColor =
    readiness?.status === "ready"
      ? "text-emerald-600"
      : readiness?.status === "needs_improvement"
        ? "text-amber-600"
        : "text-muted-foreground";

  return (
    <div className="mx-auto max-w-4xl pb-24">
      <Link
        to="/app"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to dashboard
      </Link>

      <header className="mt-4">
        <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Deliverable</div>
        <h1 className="mt-1 font-display text-3xl font-semibold">{template.label}</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{template.intro}</p>
      </header>

      {firstTime.hydrated && !firstTime.decided && (
        <div className="mt-6">
          <FirstTimeChoiceCard
            label={template.label}
            onChoose={(m) => {
              firstTime.setMode(m);
              if (m === "example") setExampleOpen(true);
            }}
          />
        </div>
      )}

      {firstTime.mode === "guided" && (
        <div className="mt-6">
          <GuidedCoachStrip
            fields={template.fields}
            values={values}
            onDismiss={() => firstTime.setMode("self")}
          />
        </div>
      )}

      {firstTime.decided && firstTime.mode !== "guided" && (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => firstTime.setMode("guided")}>
            Guide me step-by-step
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setExampleOpen(true)}>
            Show me an example
          </Button>
        </div>
      )}

      <ExampleDialog
        open={exampleOpen}
        onOpenChange={setExampleOpen}
        label={template.label}
        fields={template.fields}
      />

      {(() => {
        const why = TEMPLATE_WHY[kind as TemplateKind];
        if (!why) return null;
        return (
          <div className="mt-4">
            <WhyThisMatters
              storageKey={`template.${kind}`}
              title={why.title}
              body={
                <>
                  {why.body.map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
                </>
              }
              tip={why.tip}
            />
          </div>
        );
      })()}

      <div className="sticky top-2 z-10 mt-6 rounded-lg border border-border bg-card/95 p-3 backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-widest text-muted-foreground">
              Readiness
            </div>
            <div className={`font-display text-lg font-semibold ${statusColor}`}>
              {meter}/100 · {statusLabel}
            </div>
          </div>
          <div className="h-1.5 flex-1 min-w-[120px] max-w-xs overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full transition-all ${
                readiness?.status === "ready"
                  ? "bg-emerald-500"
                  : readiness?.status === "needs_improvement"
                    ? "bg-amber-500"
                    : "bg-muted-foreground/40"
              }`}
              style={{ width: `${meter}%` }}
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => submit.mutate({ requestReview: false })}
              disabled={submit.isPending}
            >
              {submit.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save draft
            </Button>
            <Button
              size="sm"
              onClick={() => submit.mutate({ requestReview: true })}
              disabled={submit.isPending || meter < 40}
            >
              {submit.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              Submit for AI review
            </Button>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-5">
        {template.fields.map((f) => (
          <div key={f.key} className="rounded-lg border border-border bg-card p-4">
            <label className="block text-sm font-medium">
              {f.label}
              {f.required && <span className="ml-1 text-destructive">*</span>}
            </label>
            {f.guidance && (
              <p className="mt-1 text-xs text-muted-foreground">{f.guidance}</p>
            )}
            <div className="mt-2">
              {f.kind === "text" ? (
                <Input
                  value={values[f.key] ?? ""}
                  onChange={(e) => setField(f.key, e.target.value)}
                  placeholder={f.placeholder}
                />
              ) : f.kind === "rag" ? (
                <div className="flex gap-2">
                  {(f.options ?? ["green", "amber", "red"]).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setField(f.key, opt)}
                      className={`rounded-full border px-3 py-1 text-xs capitalize ${
                        values[f.key] === opt
                          ? "border-foreground bg-foreground text-background"
                          : "border-border bg-background"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              ) : (
                <Textarea
                  value={values[f.key] ?? ""}
                  onChange={(e) => setField(f.key, e.target.value)}
                  placeholder={f.placeholder}
                  rows={f.minChars && f.minChars > 60 ? 6 : 4}
                />
              )}
            </div>
            {f.minChars && (
              <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
                <span>{(values[f.key] ?? "").length} chars</span>
                <span>min {f.minChars}</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {readiness && readiness.checks.length > 0 && (
        <div className="mt-6 rounded-lg border border-border bg-muted/40 p-4">
          <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Readiness checklist
          </div>
          <ul className="mt-2 space-y-1.5 text-sm">
            {readiness.checks.map((c, i) => (
              <li key={i} className="flex items-start gap-2">
                <CheckCircle2
                  className={`mt-0.5 h-4 w-4 shrink-0 ${
                    c.ok ? "text-emerald-600" : "text-muted-foreground/40"
                  }`}
                />
                <div>
                  <div className={c.ok ? "" : "text-muted-foreground"}>{c.label}</div>
                  {!c.ok && c.hint && (
                    <div className="text-xs text-muted-foreground">{c.hint}</div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function compileMarkdown(
  label: string,
  fields: (typeof TEMPLATES)[TemplateKind]["fields"],
  values: Record<string, string>,
): string {
  const lines: string[] = [`# ${label}`, ""];
  for (const f of fields) {
    const v = (values[f.key] ?? "").trim();
    if (!v) continue;
    lines.push(`## ${f.label}`, "", v, "");
  }
  return lines.join("\n");
}