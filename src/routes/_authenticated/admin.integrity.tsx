import { createFileRoute, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, ShieldCheck, AlertTriangle, Info, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { runSimulationIntegrityAudit } from "@/lib/integrity.functions";

export const Route = createFileRoute("/_authenticated/admin/integrity")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
    const { data: row } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", data.user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!row) throw redirect({ to: "/app" });
  },
  head: () => ({
    meta: [
      { title: "Simulation Integrity Audit · Atlas" },
      {
        name: "description",
        content:
          "Fact-check the Atlas simulation from initiation to closure: journey structure, stakeholder consistency and AI-generated content.",
      },
      { property: "og:title", content: "Simulation Integrity Audit · Atlas" },
      {
        property: "og:description",
        content: "Detect contradictions and broken steps across every Atlas simulation.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: IntegrityAdmin,
});

const TONE: Record<string, { label: string; cls: string; Icon: typeof AlertTriangle }> = {
  critical: { label: "Blocker", cls: "bg-destructive/10 text-destructive border-destructive/30", Icon: AlertTriangle },
  warning: { label: "Warning", cls: "bg-accent-orange/10 text-accent-orange border-accent-orange/30", Icon: AlertTriangle },
  info: { label: "Note", cls: "bg-muted text-muted-foreground border-border", Icon: Info },
};

function IntegrityAdmin() {
  const runFn = useServerFn(runSimulationIntegrityAudit);
  const audit = useMutation({
    mutationFn: () => runFn(),
    onError: (e: any) => toast.error(e?.message ?? "Audit failed"),
    onSuccess: (r: any) =>
      toast.success(
        r.summary.critical === 0
          ? `No blockers found across ${r.checksRun} checks`
          : `${r.summary.critical} blocker(s) found`,
      ),
  });
  const report = audit.data as any;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-4 sm:p-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
            Simulation integrity audit
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Deterministic fact-check of every simulation from initiation to closure — journey structure,
            stakeholder consistency, module links, budget maths and the content the AI has actually written to
            learners. No AI calls, no cost.
          </p>
        </div>
        <Button onClick={() => audit.mutate()} disabled={audit.isPending} className="gap-2">
          {audit.isPending ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
          Run audit
        </Button>
      </header>

      {report && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ["Blockers", report.summary.critical],
              ["Warnings", report.summary.warning],
              ["Notes", report.summary.info],
              ["Checks passed", report.summary.clean.length],
            ].map(([label, value]) => (
              <Card key={label as string} variant="soft">
                <CardContent className="p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
                  <p className="mt-1 text-2xl font-semibold">{value as number}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <p className="text-xs text-muted-foreground">
            Scanned {report.scanned.templates} projects · {report.scanned.chapters} chapters ·{" "}
            {report.scanned.instances} learner runs · {report.scanned.tasks} tasks ·{" "}
            {report.scanned.messages} stakeholder messages.
          </p>

          {report.findings.length === 0 ? (
            <Card variant="soft" tone="green">
              <CardContent className="flex items-center gap-3 p-5 text-sm">
                <CheckCircle2 className="size-5" />
                Every check passed. No contradictions detected.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {report.findings.map((f: any) => {
                const tone = TONE[f.severity] ?? TONE.info;
                return (
                  <Card key={f.id} variant="soft">
                    <CardHeader className="pb-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className={tone.cls}>
                          <tone.Icon className="mr-1 size-3" />
                          {tone.label}
                        </Badge>
                        <Badge variant="secondary">{f.area}</Badge>
                        <Badge variant="outline">{f.count} affected</Badge>
                      </div>
                      <CardTitle className="mt-2 text-base">{f.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 pt-0">
                      <p className="text-sm text-muted-foreground">{f.detail}</p>
                      <ul className="space-y-1 rounded-lg bg-background/60 p-3 text-xs font-mono">
                        {f.samples.map((s: string, i: number) => (
                          <li key={i} className="break-words">
                            {s}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {report.summary.clean.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Passed checks</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-1.5 pt-0 text-sm text-muted-foreground sm:grid-cols-2">
                {report.summary.clean.map((c: string) => (
                  <p key={c} className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-primary" />
                    {c}
                  </p>
                ))}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
