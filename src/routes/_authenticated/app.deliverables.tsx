import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { listDeliverables, type Deliverable } from "@/lib/deliverables.functions";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { FileText, Download, FileDown, CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import {
  exportDeliverableToPdf,
  exportDeliverableToDocx,
  sectionsForDeliverable,
  type DeliverableDoc,
} from "@/lib/deliverable-export";

export const Route = createFileRoute("/_authenticated/app/deliverables")({
  head: () => ({
    meta: [
      { title: "Project Deliverables — Atlas" },
      {
        name: "description",
        content:
          "Every document you produced in your Atlas simulation, versioned with sponsor decisions and downloadable as PDF or Word.",
      },
      { property: "og:title", content: "Project Deliverables — Atlas" },
      {
        property: "og:description",
        content: "Your simulated project documents, with review outcomes and exports.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DeliverablesPage,
});

function statusMeta(status: string) {
  switch (status) {
    case "approved":
      return { label: "Approved", icon: CheckCircle2, tone: "bg-emerald-50 text-emerald-700 border-emerald-200" };
    case "changes_requested":
      return { label: "Changes requested", icon: AlertTriangle, tone: "bg-amber-50 text-amber-800 border-amber-200" };
    case "under_review":
      return { label: "Under review", icon: Clock, tone: "bg-sky-50 text-sky-700 border-sky-200" };
    default:
      return { label: "Submitted", icon: Clock, tone: "bg-muted text-muted-foreground border-border" };
  }
}

function toDoc(d: Deliverable): DeliverableDoc {
  return {
    title: d.title,
    projectName: d.project_name,
    status: statusMeta(d.status).label,
    version: d.version,
    date: d.submitted_at ? new Date(d.submitted_at).toLocaleDateString() : null,
    sections: sectionsForDeliverable(d.payload, d.content_markdown),
  };
}

function fileBase(d: Deliverable) {
  return `${d.title.replace(/[^\w]+/g, "-")}-v${d.version}`;
}

function DeliverablesPage() {
  const fetchAll = useServerFn(listDeliverables);
  const { data, isLoading } = useQuery({
    queryKey: ["deliverables"],
    queryFn: () => fetchAll(),
  });
  const [open, setOpen] = useState<Deliverable | null>(null);

  const grouped = useMemo(() => {
    const map = new Map<string, Deliverable[]>();
    for (const row of data ?? []) {
      const list = map.get(row.artifact_type) ?? [];
      list.push(row);
      map.set(row.artifact_type, list);
    }
    return [...map.entries()].map(([type, rows]) => ({
      type,
      rows: rows.sort((a, b) => b.version - a.version),
    }));
  }, [data]);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-4 sm:p-6">
      <header>
        <div className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
          Portfolio
        </div>
        <h1 className="mt-1 font-display text-2xl font-medium tracking-tight sm:text-3xl">
          Project deliverables
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Every document you produced on this project, kept version by version with the reviewer's
          decision. Download any of them as a branded PDF or Word file for your portfolio.
        </p>
      </header>

      {isLoading ? (
        <Card className="p-6 text-sm text-muted-foreground">Loading your deliverables…</Card>
      ) : grouped.length === 0 ? (
        <Card variant="soft" className="p-8 text-center">
          <FileText className="mx-auto h-6 w-6 text-muted-foreground" />
          <h2 className="mt-3 font-display text-lg">Nothing filed yet</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            Complete and submit a template — a charter, register, RAID log or status report — and it
            lands here automatically with the reviewer's decision attached.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {grouped.map((group) => {
            const latest = group.rows[0];
            return (
              <Card key={group.type} variant="soft" className="p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="font-display text-lg tracking-tight">{latest.title}</h2>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {group.rows.length} version{group.rows.length === 1 ? "" : "s"}
                      {latest.reviewer_name ? ` · reviewed by ${latest.reviewer_name}` : ""}
                    </p>
                  </div>
                  <Badge variant="outline" className={statusMeta(latest.status).tone}>
                    {statusMeta(latest.status).label}
                  </Badge>
                </div>

                <ul className="mt-3 divide-y divide-border/70 rounded-lg border border-border/70 bg-background/70">
                  {group.rows.map((row) => {
                    const meta = statusMeta(row.status);
                    const Icon = meta.icon;
                    return (
                      <li
                        key={row.id}
                        className="flex flex-wrap items-center justify-between gap-3 px-3 py-2.5"
                      >
                        <button
                          type="button"
                          onClick={() => setOpen(row)}
                          className="flex min-w-0 items-center gap-2 text-left"
                        >
                          <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium">
                              Version {row.version}
                              {row.is_latest ? " · current" : ""}
                            </span>
                            <span className="block truncate text-[11px] text-muted-foreground">
                              {row.submitted_at
                                ? new Date(row.submitted_at).toLocaleString()
                                : "Not submitted"}
                              {typeof row.review_result?.score === "number"
                                ? ` · scored ${row.review_result.score}/100`
                                : ""}
                            </span>
                          </span>
                        </button>
                        <div className="flex shrink-0 items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => exportDeliverableToPdf(toDoc(row), `${fileBase(row)}.pdf`)}
                          >
                            <FileDown className="mr-1.5 h-3.5 w-3.5" /> PDF
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => exportDeliverableToDocx(toDoc(row), `${fileBase(row)}.docx`)}
                          >
                            <Download className="mr-1.5 h-3.5 w-3.5" /> Word
                          </Button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!open} onOpenChange={(v) => !v && setOpen(null)}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          {open ? (
            <>
              <DialogHeader>
                <DialogTitle className="font-display text-xl">
                  {open.title} · v{open.version}
                </DialogTitle>
                <DialogDescription>
                  {statusMeta(open.status).label}
                  {open.reviewer_name ? ` · ${open.reviewer_name}` : ""}
                </DialogDescription>
              </DialogHeader>

              {open.review_result?.comment ? (
                <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm">
                  <div className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                    Reviewer decision
                  </div>
                  <p className="mt-1">{open.review_result.comment}</p>
                  {(open.review_result.required_changes ?? []).length > 0 ? (
                    <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-muted-foreground">
                      {open.review_result.required_changes!.map((c) => (
                        <li key={c}>{c}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ) : null}

              <div className="space-y-4">
                {sectionsForDeliverable(open.payload, open.content_markdown).map((s) => (
                  <section key={s.heading}>
                    <h3 className="text-sm font-medium">{s.heading}</h3>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{s.body}</p>
                  </section>
                ))}
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                <Button onClick={() => exportDeliverableToPdf(toDoc(open), `${fileBase(open)}.pdf`)}>
                  <FileDown className="mr-1.5 h-4 w-4" /> Download PDF
                </Button>
                <Button
                  variant="outline"
                  onClick={() => exportDeliverableToDocx(toDoc(open), `${fileBase(open)}.docx`)}
                >
                  <Download className="mr-1.5 h-4 w-4" /> Download Word
                </Button>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}