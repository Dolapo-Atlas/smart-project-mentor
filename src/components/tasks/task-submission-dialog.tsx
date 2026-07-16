import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  Loader2,
  Send,
  Sparkles,
  Upload,
  X,
  Circle,
} from "lucide-react";
import {
  TEMPLATES,
  detectTemplateKind,
  evaluateCharter,
  evaluateRaid,
  evaluateStatusReport,
  evaluateGenericTemplate,
  encodeSubmission,
  type Readiness,
  type ReadinessStatus,
  type SubmissionPayload,
  type TemplateKind,
  type RaidCounts,
} from "@/lib/templates";
import { listRaid } from "@/lib/raid.functions";
import { getOverview } from "@/lib/sim.functions";
import { checkSubmissionReadiness } from "@/lib/submission.functions";
import { supabase } from "@/integrations/supabase/client";
import { recordDocument } from "@/lib/sim.functions";

type TaskLike = {
  id: string;
  title: string;
  description?: string | null;
  category?: string | null;
  linked_area?: string | null;
  completion_action?: string | null;
};

const STATUS_STYLE: Record<ReadinessStatus, { label: string; className: string; icon: typeof CheckCircle2 }> = {
  not_ready: {
    label: "Not Ready",
    className: "border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-300",
    icon: Circle,
  },
  needs_improvement: {
    label: "Needs Improvement",
    className: "border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300",
    icon: AlertTriangle,
  },
  ready: {
    label: "Ready to Submit",
    className: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    icon: CheckCircle2,
  },
};

function ReadinessMeter({ readiness, aiReadiness }: { readiness: Readiness; aiReadiness: Readiness | null }) {
  const style = STATUS_STYLE[readiness.status];
  const Icon = style.icon;
  return (
    <div className={`rounded-lg border p-3 ${style.className}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Icon className="h-4 w-4" />
          {style.label}
        </div>
        <div className="text-xs tabular-nums">
          <span className="font-semibold">{readiness.score}</span>
          <span className="opacity-70">/100 rules</span>
          {aiReadiness ? (
            <span className="ml-2">
              · AI <span className="font-semibold">{aiReadiness.score}</span>
              <span className="opacity-70">/100</span>
            </span>
          ) : null}
        </div>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
        <div
          className="h-full rounded-full bg-current opacity-60 transition-all duration-500"
          style={{ width: `${readiness.score}%` }}
        />
      </div>
      <ul className="mt-2 space-y-1 text-[11px]">
        {readiness.checks.slice(0, 6).map((c, i) => (
          <li key={i} className="flex items-start gap-1.5">
            {c.ok ? (
              <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 opacity-80" />
            ) : (
              <Circle className="mt-0.5 h-3 w-3 shrink-0 opacity-60" />
            )}
            <span className={c.ok ? "opacity-90" : ""}>
              {c.label}
              {c.hint && !c.ok ? <span className="ml-1 opacity-70">— {c.hint}</span> : null}
            </span>
          </li>
        ))}
      </ul>
      {aiReadiness && aiReadiness.checks.length > 0 && (
        <div className="mt-2 border-t border-current/20 pt-2">
          <div className="mb-1 text-[10px] uppercase tracking-wider opacity-70">AI contextual review</div>
          <ul className="space-y-1 text-[11px]">
            {aiReadiness.checks.slice(0, 6).map((c, i) => (
              <li key={i} className="flex items-start gap-1.5">
                {c.ok ? (
                  <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 opacity-80" />
                ) : (
                  <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 opacity-70" />
                )}
                <span>{c.label}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function RaidCountsCard({ counts }: { counts: RaidCounts }) {
  const sections: { key: "risk" | "assumption" | "issue" | "dependency"; label: string; count: number }[] = [
    { key: "risk", label: "Risks", count: counts.risk },
    { key: "assumption", label: "Assumptions", count: counts.assumption },
    { key: "issue", label: "Issues", count: counts.issue },
    { key: "dependency", label: "Dependencies", count: counts.dependency },
  ];
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3">
      <div className="flex items-center justify-between">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Live RAID coverage
        </div>
        <Link
          to="/app/raid"
          className="text-[11px] font-medium text-primary hover:underline"
        >
          Open RAID module →
        </Link>
      </div>
      <div className="mt-2 grid grid-cols-4 gap-2">
        {sections.map((s) => (
          <Link
            key={s.key}
            to="/app/raid"
            hash={s.key}
            className={`rounded-md border p-2 text-center transition hover:border-primary/50 ${
              s.count === 0 ? "border-dashed border-amber-500/40 bg-amber-500/5" : "border-border bg-background"
            }`}
          >
            <div className="text-lg font-semibold tabular-nums">{s.count}</div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.label}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}

type UploadState =
  | { status: "empty" }
  | { status: "uploading"; file: File }
  | { status: "done"; documentId: string; title: string; size: number; path: string }
  | { status: "error"; message: string };

export function TaskSubmissionDialog({
  task,
  open,
  onOpenChange,
  onSubmit,
  submitting,
}: {
  task: TaskLike | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (submission: string) => void;
  submitting: boolean;
}) {
  const templateKind = useMemo<TemplateKind | null>(
    () => (task ? detectTemplateKind(task) : null),
    [task],
  );
  const template = templateKind ? TEMPLATES[templateKind] : null;

  const [mode, setMode] = useState<"template" | "upload" | "free_text">(
    templateKind ? "template" : "free_text",
  );
  const [values, setValues] = useState<Record<string, string>>({});
  const [freeText, setFreeText] = useState("");
  const [uploadNote, setUploadNote] = useState("");
  const [uploadState, setUploadState] = useState<UploadState>({ status: "empty" });
  const [aiReadiness, setAiReadiness] = useState<Readiness | null>(null);
  const [aiChecking, setAiChecking] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setMode(templateKind ? "template" : "free_text");
      setValues({});
      setFreeText("");
      setUploadNote("");
      setUploadState({ status: "empty" });
      setAiReadiness(null);
    }
  }, [open, templateKind]);

  // Live RAID counts for the RAID template.
  const fetchRaid = useServerFn(listRaid);
  const raidQuery = useQuery({
    queryKey: ["raid"],
    queryFn: () => fetchRaid() as Promise<Array<Record<string, unknown>>>,
    enabled: open && templateKind === "raid_log",
    refetchInterval: open && templateKind === "raid_log" ? 4000 : false,
  });
  const raidCounts: RaidCounts = useMemo(() => {
    const rows = (raidQuery.data ?? []) as any[];
    const c: RaidCounts = {
      risk: 0,
      assumption: 0,
      issue: 0,
      dependency: 0,
      highOrCriticalRisks: 0,
      risksWithOwnerAndMitigation: 0,
    };
    for (const r of rows) {
      const k = String(r.kind ?? "").toLowerCase();
      if (k === "risk") c.risk++;
      else if (k === "assumption") c.assumption++;
      else if (k === "issue") c.issue++;
      else if (k === "dependency") c.dependency++;
      if (k === "risk") {
        const sev = String(r.severity ?? "").toLowerCase();
        if (sev === "high" || sev === "critical") c.highOrCriticalRisks++;
        if ((r.owner ?? "").toString().trim() && (r.mitigation ?? "").toString().trim()) {
          c.risksWithOwnerAndMitigation++;
        }
      }
    }
    return c;
  }, [raidQuery.data]);

  // Project context for readiness scoring.
  const fetchOverview = useServerFn(getOverview);
  const overviewQuery = useQuery({
    queryKey: ["overview"],
    queryFn: () => fetchOverview(),
    enabled: open,
  });
  const projectCtx = useMemo(
    () => ({
      projectName: (overviewQuery.data as any)?.state?.project_name ?? null,
      stakeholders: [] as string[],
    }),
    [overviewQuery.data],
  );

  const rulesReadiness: Readiness = useMemo(() => {
    if (mode === "upload") {
      const uploaded = uploadState.status === "done";
      const checks = [
        { label: "PDF uploaded and attached", ok: uploaded, hint: uploaded ? undefined : "Upload the completed PDF before submitting." },
        { label: "Note explains what was uploaded", ok: uploadNote.trim().length >= 20, hint: "Add a short note (at least 20 characters) so the reviewer knows what to look at." },
      ];
      const score = (uploaded ? 60 : 0) + (uploadNote.trim().length >= 20 ? 30 : 0) + (uploadNote.trim().length >= 100 ? 10 : 0);
      const status: ReadinessStatus = score < 40 ? "not_ready" : score < 80 ? "needs_improvement" : "ready";
      return { score, status, checks, source: "rules" };
    }
    if (mode === "free_text") {
      const len = freeText.trim().length;
      const checks = [
        { label: "At least a paragraph of detail", ok: len >= 120, hint: "Add more specifics." },
        { label: "Mentions a name, date, or number", ok: /(\d|[A-Z][a-z]+ [A-Z][a-z]+)/.test(freeText), hint: "Reference a real person, date, or metric." },
      ];
      const score = Math.min(100, Math.round((len / 200) * 60) + (checks[1].ok ? 20 : 0));
      const status: ReadinessStatus = score < 40 ? "not_ready" : score < 80 ? "needs_improvement" : "ready";
      return { score, status, checks, source: "rules" };
    }
    if (templateKind === "project_charter") return evaluateCharter(values, projectCtx);
    if (templateKind === "status_report") return evaluateStatusReport(values, projectCtx);
    if (templateKind === "raid_log") return evaluateRaid(raidCounts);
    if (templateKind) return evaluateGenericTemplate(templateKind, values, projectCtx);
    return { score: 0, status: "not_ready", checks: [], source: "rules" };
  }, [mode, templateKind, values, uploadState, uploadNote, freeText, raidCounts, projectCtx]);

  const combinedStatus: ReadinessStatus = aiReadiness
    ? aiReadiness.status === "not_ready" || rulesReadiness.status === "not_ready"
      ? "not_ready"
      : aiReadiness.status === "ready" && rulesReadiness.status === "ready"
      ? "ready"
      : "needs_improvement"
    : rulesReadiness.status;

  const blocked = combinedStatus === "not_ready";

  const aiCheckFn = useServerFn(checkSubmissionReadiness);
  const recordDocumentFn = useServerFn(recordDocument);

  async function runAiCheck() {
    if (!task) return;
    setAiChecking(true);
    try {
      const readiness = await aiCheckFn({
        data: {
          task_id: task.id,
          template: templateKind ?? undefined,
          kind: mode === "upload" ? "upload" : "template",
          values: mode === "template" ? values : undefined,
          upload_note: mode === "upload" ? uploadNote : undefined,
          upload_document_id:
            mode === "upload" && uploadState.status === "done" ? uploadState.documentId : undefined,
        },
      });
      setAiReadiness(readiness);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "AI readiness check failed");
    } finally {
      setAiChecking(false);
    }
  }

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !task) return;
    if (file.type !== "application/pdf" && !/\.pdf$/i.test(file.name)) {
      toast.error("Please upload a PDF file.");
      if (fileInput.current) fileInput.current.value = "";
      return;
    }
    setUploadState({ status: "uploading", file });
    try {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) throw new Error("Not signed in");
      const safe = file.name.replace(/[^\w.\-]/g, "_");
      const path = `${uid}/task-${task.id}/${Date.now()}-${safe}`;
      const { error } = await supabase.storage.from("project-documents").upload(path, file, {
        contentType: "application/pdf",
        upsert: false,
      });
      if (error) throw error;
      const doc = await recordDocumentFn({
        data: {
          title: file.name,
          storage_path: path,
          mime_type: "application/pdf",
          size_bytes: file.size,
        },
      });
      setUploadState({
        status: "done",
        documentId: (doc as any).id,
        title: file.name,
        size: file.size,
        path,
      });
    } catch (err) {
      setUploadState({ status: "error", message: err instanceof Error ? err.message : "Upload failed" });
    } finally {
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  function removeUpload() {
    setUploadState({ status: "empty" });
  }

  function handleSubmit() {
    if (!task || blocked) return;
    let payload: SubmissionPayload;
    if (mode === "template" && templateKind) {
      payload = {
        kind: "template",
        template: templateKind,
        values,
        readiness: rulesReadiness,
        ai_readiness: aiReadiness,
      };
    } else if (mode === "upload") {
      if (uploadState.status !== "done") return;
      payload = {
        kind: "upload",
        template: templateKind ?? null,
        document_id: uploadState.documentId,
        document_title: uploadState.title,
        note: uploadNote,
        readiness: rulesReadiness,
        ai_readiness: aiReadiness,
      };
    } else {
      payload = { kind: "free_text", text: freeText };
    }
    const encoded = mode === "free_text" ? freeText : encodeSubmission(payload);
    onSubmit(encoded);
  }

  const showTabs = templateKind !== null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Submit: {task?.title}</DialogTitle>
          <DialogDescription>
            {task?.completion_action ??
              (template
                ? template.intro
                : "Describe what you produced and where it lives.")}
          </DialogDescription>
        </DialogHeader>

        {showTabs ? (
          <Tabs value={mode} onValueChange={(v) => setMode(v as typeof mode)} className="mt-2">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="template">
                <Sparkles className="mr-2 h-3.5 w-3.5" /> Use Atlas Template
              </TabsTrigger>
              <TabsTrigger value="upload">
                <Upload className="mr-2 h-3.5 w-3.5" /> Upload Completed Document
              </TabsTrigger>
            </TabsList>

            <TabsContent value="template" className="mt-4 space-y-4">
              {template && (
                <p className="text-xs text-muted-foreground">{template.intro}</p>
              )}
              {templateKind === "raid_log" && <RaidCountsCard counts={raidCounts} />}
              {templateKind !== "raid_log" && template && (
                <div className="space-y-3">
                  {template.fields.map((f) => (
                    <div key={f.key}>
                      <label className="text-xs font-semibold text-foreground">
                        {f.label}
                        {f.required && <span className="ml-1 text-destructive">*</span>}
                      </label>
                      {f.guidance && (
                        <div className="mt-0.5 text-[11px] text-muted-foreground">{f.guidance}</div>
                      )}
                      {f.kind === "textarea" ? (
                        <Textarea
                          className="mt-1"
                          rows={3}
                          placeholder={f.placeholder}
                          value={values[f.key] ?? ""}
                          onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                        />
                      ) : f.kind === "rag" ? (
                        <div className="mt-1 flex gap-2">
                          {(f.options ?? ["green", "amber", "red"]).map((opt) => (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => setValues((v) => ({ ...v, [f.key]: opt }))}
                              className={`rounded-md border px-3 py-1 text-xs uppercase tracking-wider transition ${
                                values[f.key] === opt
                                  ? opt === "green"
                                    ? "border-emerald-500 bg-emerald-500/10 text-emerald-700"
                                    : opt === "amber"
                                    ? "border-amber-500 bg-amber-500/10 text-amber-700"
                                    : "border-red-500 bg-red-500/10 text-red-700"
                                  : "border-border text-muted-foreground hover:border-foreground/40"
                              }`}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <Input
                          className="mt-1"
                          placeholder={f.placeholder}
                          value={values[f.key] ?? ""}
                          onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
              {templateKind === "raid_log" && (
                <div>
                  <label className="text-xs font-semibold text-foreground">
                    Submission note (optional)
                  </label>
                  <Textarea
                    className="mt-1"
                    rows={3}
                    placeholder="Anything the reviewer should know about how you built the log?"
                    value={values.narrative ?? ""}
                    onChange={(e) => setValues((v) => ({ ...v, narrative: e.target.value }))}
                  />
                </div>
              )}
            </TabsContent>

            <TabsContent value="upload" className="mt-4 space-y-4">
              <UploadArea
                uploadState={uploadState}
                onPick={() => fileInput.current?.click()}
                onRemove={removeUpload}
              />
              <input
                ref={fileInput}
                type="file"
                accept="application/pdf,.pdf"
                className="hidden"
                onChange={onPickFile}
              />
              <div>
                <label className="text-xs font-semibold text-foreground">
                  Cover note<span className="ml-1 text-destructive">*</span>
                </label>
                <Textarea
                  className="mt-1"
                  rows={4}
                  placeholder="What does this document cover? Point the reviewer at the important sections."
                  value={uploadNote}
                  onChange={(e) => setUploadNote(e.target.value)}
                />
              </div>
            </TabsContent>
          </Tabs>
        ) : (
          <div className="mt-4">
            <Textarea
              rows={7}
              placeholder="What did you do? Paste a summary, link, or excerpt of your work…"
              value={freeText}
              onChange={(e) => setFreeText(e.target.value)}
            />
          </div>
        )}

        <div className="mt-4 space-y-3">
          <ReadinessMeter readiness={rulesReadiness} aiReadiness={aiReadiness} />
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={runAiCheck}
              disabled={aiChecking || (mode === "upload" && uploadState.status !== "done")}
            >
              {aiChecking ? (
                <>
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> Checking…
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-3.5 w-3.5" /> Check readiness with AI
                </>
              )}
            </Button>
            {combinedStatus === "needs_improvement" && (
              <span className="text-[11px] text-amber-700 dark:text-amber-300">
                You can still submit, but the reviewer will flag gaps.
              </span>
            )}
            {combinedStatus === "not_ready" && (
              <span className="text-[11px] text-red-700 dark:text-red-300">
                Address the required checks above before you can submit.
              </span>
            )}
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={blocked || submitting}>
            <Send className="mr-2 h-4 w-4" />
            {submitting ? "Submitting…" : "Submit for review"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function UploadArea({
  uploadState,
  onPick,
  onRemove,
}: {
  uploadState: UploadState;
  onPick: () => void;
  onRemove: () => void;
}) {
  if (uploadState.status === "done") {
    const kb = Math.round(uploadState.size / 1024);
    return (
      <div className="flex items-center justify-between rounded-md border border-emerald-500/40 bg-emerald-500/5 p-3">
        <div className="flex items-center gap-3 min-w-0">
          <FileText className="h-5 w-5 shrink-0 text-emerald-700 dark:text-emerald-300" />
          <div className="min-w-0">
            <div className="truncate text-sm font-medium">{uploadState.title}</div>
            <div className="text-[11px] text-muted-foreground">{kb} KB · PDF · attached to task</div>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onRemove}>
          <X className="mr-1 h-3.5 w-3.5" /> Replace
        </Button>
      </div>
    );
  }
  if (uploadState.status === "uploading") {
    return (
      <div className="flex items-center gap-3 rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Uploading {uploadState.file.name}…
      </div>
    );
  }
  if (uploadState.status === "error") {
    return (
      <div className="space-y-2 rounded-md border border-red-500/40 bg-red-500/5 p-3">
        <div className="text-sm text-red-700 dark:text-red-300">{uploadState.message}</div>
        <Button variant="outline" size="sm" onClick={onPick}>
          Try again
        </Button>
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={onPick}
      className="flex w-full flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-border bg-muted/20 p-6 text-sm text-muted-foreground transition hover:border-primary/50 hover:text-foreground"
    >
      <Upload className="h-5 w-5" />
      <div className="font-medium">Upload completed PDF</div>
      <div className="text-[11px]">Only PDF files are accepted (max 20 MB).</div>
    </button>
  );
}