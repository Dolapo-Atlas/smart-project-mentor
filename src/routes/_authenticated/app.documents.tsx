import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listDocuments, recordDocument, reviewDocument, signedDocUrl } from "@/lib/sim.functions";
import { supabase } from "@/integrations/supabase/client";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload, FileText, Sparkles, Loader2, FolderOpen } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import documentsEmpty from "@/assets/illustrations/documents-empty.png";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/documents")({
  component: Documents,
});

async function readTextExcerpt(file: File): Promise<string | undefined> {
  if (file.type.startsWith("text/") || /\.(md|txt|json|csv)$/i.test(file.name)) {
    try {
      const t = await file.text();
      return t.slice(0, 8000);
    } catch {
      return undefined;
    }
  }
  return undefined;
}

function Documents() {
  const qc = useQueryClient();
  const fetchDocs = useServerFn(listDocuments);
  const recordFn = useServerFn(recordDocument);
  const reviewFn = useServerFn(reviewDocument);
  const signFn = useServerFn(signedDocUrl);
  const { data: docs } = useQuery({ queryKey: ["documents"], queryFn: () => fetchDocs() });
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = docs?.find((d) => d.id === selectedId) ?? docs?.[0];

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) throw new Error("Not signed in");
      const path = `${uid}/${Date.now()}-${file.name.replace(/[^\w.\-]/g, "_")}`;
      const { error } = await supabase.storage.from("project-documents").upload(path, file, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });
      if (error) throw error;
      const excerpt = await readTextExcerpt(file);
      await recordFn({
        data: {
          title: file.name,
          storage_path: path,
          content_excerpt: excerpt,
          mime_type: file.type,
          size_bytes: file.size,
        },
      });
      toast.success("Uploaded.");
      qc.invalidateQueries({ queryKey: ["documents"] });
      qc.invalidateQueries({ queryKey: ["overview"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  const review = useMutation({
    mutationFn: (id: string) => reviewFn({ data: { document_id: id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["documents"] });
      qc.invalidateQueries({ queryKey: ["overview"] });
      qc.invalidateQueries({ queryKey: ["inbox"] });
      toast.success("Review in. The story moves on.");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Review failed"),
  });

  async function openDoc(path: string) {
    try {
      const res = await signFn({ data: { path } });
      window.open(res.signedUrl, "_blank");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not open file");
    }
  }

  const feedback = (selected as {
    ai_feedback?: Array<{
      id: string;
      summary: string;
      score: number;
      strengths: string[];
      weaknesses: string[];
      recommendations: string[];
      category_scores?: Record<string, number>;
      created_at: string;
    }>;
  } | undefined)?.ai_feedback?.[0];

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Deliverables</div>
          <h1 className="font-display text-4xl font-medium">Documents</h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Upload briefs, plans, memos. Plain-text files (.txt, .md) get the richest AI review since
            the panel can read them in full.
          </p>
        </div>
        <div>
          <input ref={fileInput} type="file" onChange={onPick} className="hidden" />
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={() => fileInput.current?.click()} disabled={uploading}>
              {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
              {uploading ? "Uploading…" : "Upload (PDF, DOCX, XLSX)"}
            </Button>
          </div>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <ul className="space-y-2">
          {(docs ?? []).length === 0 && (
            <li>
              <EmptyState
                icon={FolderOpen}
                illustration={documentsEmpty}
                title="No documents uploaded."
                body="Templates are one tab over — start there, then bring the panel in for review."
                cta={{ label: "Browse templates", to: "/app/templates" }}
              />
            </li>
          )}
          {docs?.map((d) => (
            <li key={d.id}>
              <button
                onClick={() => setSelectedId(d.id)}
                className={`w-full rounded-md border p-4 text-left ${
                  selected?.id === d.id ? "border-foreground bg-card" : "border-border bg-card/60 hover:bg-card"
                }`}
              >
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  <span className="truncate text-sm font-medium">{d.title}</span>
                </div>
                <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                  <span className="capitalize">{d.status}</span>
                  {typeof d.quality_score === "number" && (
                    <span className="font-semibold text-foreground">{d.quality_score}/100</span>
                  )}
                </div>
              </button>
            </li>
          ))}
        </ul>

        <article className="min-h-[400px] rounded-lg border border-border bg-card p-8">
          {selected ? (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    {selected.mime_type || "document"} · {Math.round((selected.size_bytes ?? 0) / 1024)} KB
                  </div>
                  <h2 className="mt-1 font-display text-2xl font-medium">{selected.title}</h2>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => openDoc(selected.storage_path)}>
                    Open
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => review.mutate(selected.id)}
                    disabled={review.isPending}
                  >
                    {review.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="mr-2 h-4 w-4" />
                    )}
                    {selected.status === "reviewed" ? "Re-review" : "Request AI review"}
                  </Button>
                </div>
              </div>

              <div className="mt-6">
                {feedback ? (
                  <FeedbackPanel feedback={feedback} />
                ) : (
                  <div className="rounded-md border border-dashed border-border p-6 text-sm text-muted-foreground">
                    No AI feedback yet. Request a review to bring the panel in.
                  </div>
                )}
              </div>

              {selected.content_excerpt && (
                <div className="mt-8">
                  <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Excerpt</div>
                  <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap rounded-md bg-muted/50 p-4 text-xs leading-relaxed">
                    {selected.content_excerpt}
                  </pre>
                </div>
              )}
            </>
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              Select a document
            </div>
          )}
        </article>
      </div>
    </div>
  );
}

function FeedbackPanel({
  feedback,
}: {
  feedback: {
    summary: string;
    score: number;
    strengths: string[];
    weaknesses: string[];
    recommendations: string[];
    category_scores?: Record<string, number>;
  };
}) {
  const cats = feedback.category_scores ?? {};
  const catList: Array<[string, string]> = [
    ["clarity", "Clarity"],
    ["completeness", "Completeness"],
    ["professionalism", "Professionalism"],
    ["governance", "Governance"],
  ];
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-primary font-display text-2xl font-semibold text-primary">
          {feedback.score}
        </div>
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">AI review panel</div>
          <p className="mt-1 font-display text-lg leading-snug">{feedback.summary}</p>
        </div>
      </div>
      {Object.keys(cats).length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {catList.map(([k, label]) => (
            <div key={k} className="rounded-md border border-border bg-background p-3">
              <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</div>
              <div className="mt-1 font-display text-xl font-semibold">{cats[k] ?? "—"}<span className="text-xs text-muted-foreground">/100</span></div>
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full bg-primary" style={{ width: `${cats[k] ?? 0}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-3">
        <Block title="Strengths" items={feedback.strengths} tone="text-emerald-700 dark:text-emerald-400" />
        <Block title="Weaknesses" items={feedback.weaknesses} tone="text-orange-700 dark:text-orange-400" />
        <Block title="Recommendations" items={feedback.recommendations} tone="text-primary" />
      </div>
    </div>
  );
}

function Block({ title, items, tone }: { title: string; items: string[]; tone: string }) {
  return (
    <div className="rounded-md border border-border bg-background p-4">
      <div className={`text-xs font-semibold uppercase tracking-widest ${tone}`}>{title}</div>
      <ul className="mt-2 space-y-1.5 text-sm">
        {items.length === 0 && <li className="text-muted-foreground">—</li>}
        {items.map((it, i) => (
          <li key={i} className="leading-snug">• {it}</li>
        ))}
      </ul>
    </div>
  );
}