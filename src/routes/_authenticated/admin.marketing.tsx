import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Sparkles, Download, Trash2, FileText } from "lucide-react";
import {
  generateMarketing,
  listMarketing,
  deleteMarketing,
} from "@/lib/marketing.functions";

export const Route = createFileRoute("/_authenticated/admin/marketing")({
  component: MarketingAgent,
});

type Kind = "content" | "distribution" | "ads" | "campaign";

const KIND_LABEL: Record<Kind, string> = {
  content: "Content piece",
  distribution: "Distribution plan",
  ads: "Ad copy & creative",
  campaign: "Full campaign",
};

function toMarkdown(kind: Kind, title: string, content: any): string {
  const lines: string[] = [`# ${title}`, "", `_Kind: ${KIND_LABEL[kind]}_`, ""];
  if (kind === "content") {
    lines.push(`**Hook**\n\n${content.hook}\n`);
    lines.push(`## Body\n\n${content.body_markdown}\n`);
    lines.push(`**CTA:** ${content.cta}\n`);
    lines.push(`**Hashtags:** ${(content.hashtags ?? []).join(" ")}\n`);
    lines.push(`## Variations`);
    for (const v of content.variations ?? []) lines.push(`### ${v.label}\n${v.text}\n`);
  } else if (kind === "distribution") {
    lines.push(content.summary, "");
    lines.push(`## Channels`);
    for (const c of content.channels ?? [])
      lines.push(
        `### ${c.channel}\n- Cadence: ${c.cadence}\n- Angle: ${c.angle}\n\n**First post:**\n${c.first_post}\n`,
      );
    lines.push(`## Repurposing`);
    for (const r of content.repurpose_plan ?? []) lines.push(`- ${r}`);
    lines.push(`\n## KPIs`);
    for (const k of content.kpis ?? []) lines.push(`- ${k}`);
  } else if (kind === "ads") {
    lines.push(content.platform_notes ?? "", "");
    for (const a of content.ads ?? [])
      lines.push(
        `## ${a.platform}\n- **Headline:** ${a.headline}\n- **Primary:** ${a.primary_text}\n- **Description:** ${a.description}\n- **CTA:** ${a.cta}\n- **Audience:** ${a.audience}\n`,
      );
  } else {
    lines.push(`## ${content.campaign_name}\n\n${content.narrative}\n`);
    lines.push(`## Hero content\n`, toMarkdown("content", content.content?.title ?? "Content", content.content));
    lines.push(`## Distribution\n`, toMarkdown("distribution", "Distribution", content.distribution));
    lines.push(`## Ads\n`, toMarkdown("ads", "Ads", content.ads));
  }
  return lines.join("\n");
}

function download(name: string, text: string, mime = "text/markdown") {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

function MarketingAgent() {
  const qc = useQueryClient();
  const listFn = useServerFn(listMarketing);
  const genFn = useServerFn(generateMarketing);
  const delFn = useServerFn(deleteMarketing);

  const { data: assets } = useQuery({
    queryKey: ["marketing-assets"],
    queryFn: () => listFn(),
  });

  const [kind, setKind] = useState<Kind>("content");
  const [title, setTitle] = useState("");
  const [brief, setBrief] = useState("");
  const [channel, setChannel] = useState("");
  const [audience, setAudience] = useState("");

  const gen = useMutation({
    mutationFn: () =>
      genFn({ data: { kind, title, brief, channel: channel || undefined, audience: audience || undefined } }),
    onSuccess: () => {
      toast.success("Asset generated");
      setBrief("");
      setTitle("");
      qc.invalidateQueries({ queryKey: ["marketing-assets"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to generate"),
  });

  const del = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["marketing-assets"] }),
  });

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <header>
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5" /> Marketing Agent
        </div>
        <h1 className="mt-2 font-display text-3xl">Content, distribution & ads for Atlas</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Anchored on Atlas positioning and the DCR flagship. Everything you generate is saved and exportable.
        </p>
      </header>

      <Card className="p-5">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label>What do you need?</Label>
            <Select value={kind} onValueChange={(v) => setKind(v as Kind)}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(KIND_LABEL) as Kind[]).map((k) => (
                  <SelectItem key={k} value={k}>{KIND_LABEL[k]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Title (optional)</Label>
            <Input className="mt-1" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Launch week LinkedIn thread" />
          </div>
          <div>
            <Label>Primary channel (optional)</Label>
            <Input className="mt-1" value={channel} onChange={(e) => setChannel(e.target.value)} placeholder="LinkedIn, TikTok, Blog, Google Ads…" />
          </div>
          <div>
            <Label>Audience (optional)</Label>
            <Input className="mt-1" value={audience} onChange={(e) => setAudience(e.target.value)} placeholder="Career switchers into PM" />
          </div>
          <div className="md:col-span-2">
            <Label>Brief</Label>
            <Textarea
              className="mt-1 min-h-[140px]"
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
              placeholder="What are we saying, to whom, and why now? Include any angle, urgency, or offer."
            />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <Button onClick={() => gen.mutate()} disabled={gen.isPending || brief.trim().length < 5}>
            {gen.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            Generate
          </Button>
        </div>
      </Card>

      <section className="space-y-4">
        <h2 className="font-display text-xl">Saved assets</h2>
        {(!assets || assets.length === 0) && (
          <p className="text-sm text-muted-foreground">Nothing yet. Generate your first piece above.</p>
        )}
        {(assets ?? []).map((a: any) => {
          const md = toMarkdown(a.kind, a.title, a.content);
          return (
            <Card key={a.id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{KIND_LABEL[a.kind as Kind]}</Badge>
                    {a.channel && <Badge variant="outline">{a.channel}</Badge>}
                    <span className="text-xs text-muted-foreground">
                      {new Date(a.created_at).toLocaleString()}
                    </span>
                  </div>
                  <h3 className="mt-1 font-display text-lg">{a.title}</h3>
                  <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{a.brief}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => download(`${a.title}.md`, md)}>
                    <FileText className="mr-1.5 h-3.5 w-3.5" /> Markdown
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => download(`${a.title}.json`, JSON.stringify(a.content, null, 2), "application/json")}>
                    <Download className="mr-1.5 h-3.5 w-3.5" /> JSON
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => del.mutate(a.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <pre className="mt-4 max-h-96 overflow-auto whitespace-pre-wrap rounded-md border border-border/60 bg-muted/40 p-3 text-xs leading-relaxed">
{md}
              </pre>
            </Card>
          );
        })}
      </section>
    </div>
  );
}