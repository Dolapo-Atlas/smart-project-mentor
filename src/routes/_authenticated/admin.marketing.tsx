import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Loader2, Sparkles, Download, Trash2, FileText, Copy, Search,
  Lightbulb, ImageIcon, Brain,
} from "lucide-react";
import {
  generateMarketing, listMarketing, deleteMarketing,
  duplicateMarketing, generateIdeas,
  analyseSwipe, listSwipes, deleteSwipe,
} from "@/lib/marketing.functions";

export const Route = createFileRoute("/_authenticated/admin/marketing")({
  component: MarketingWorkspace,
});

type Kind = "content" | "distribution" | "ads" | "campaign";

const CAMPAIGNS = [
  "Launch Week","Website Update","New Simulation","Founder Story","Behind the Build",
  "Product Philosophy","Feature Release","Customer Feedback","Investor Update","Growth Milestone",
  "Web Summit","Conference","Job Search Content","Interview Content","PM Content","General Brand Awareness",
];
const PLATFORMS = ["LinkedIn","X","Instagram","TikTok","Reddit","Medium","Blog","Newsletter"];
const ASSET_TYPES = ["Post","Carousel","Article","Thread","Video Script","Ad Copy","Landing Page","Email","Comment Reply","DM","Press Release"];
const TONES = ["Founder","Educational","Thought Leadership","Storytelling","Launch","Funny","Bold","Minimal","Professional"];

function download(name: string, text: string, mime = "text/markdown") {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}

function toMarkdown(kind: Kind, title: string, content: any): string {
  const L: string[] = [`# ${title}`, ""];
  if (kind === "content") {
    L.push(`**Hook**\n\n${content.hook}\n`);
    L.push(`## Body\n\n${content.body_markdown}\n`);
    L.push(`**CTA:** ${content.cta}\n`);
    L.push(`**Hashtags:** ${(content.hashtags ?? []).join(" ")}\n`);
    L.push(`## Variations`);
    for (const v of content.variations ?? []) L.push(`### ${v.label}\n${v.text}\n`);
  } else if (kind === "distribution") {
    L.push(content.summary ?? "", "");
    for (const c of content.channels ?? [])
      L.push(`### ${c.channel}\n- Cadence: ${c.cadence}\n- Angle: ${c.angle}\n\n**First post:**\n${c.first_post}\n`);
    L.push(`## Repurposing`); for (const r of content.repurpose_plan ?? []) L.push(`- ${r}`);
    L.push(`\n## KPIs`); for (const k of content.kpis ?? []) L.push(`- ${k}`);
  } else if (kind === "ads") {
    L.push(content.platform_notes ?? "", "");
    for (const a of content.ads ?? [])
      L.push(`## ${a.platform}\n- **Headline:** ${a.headline}\n- **Primary:** ${a.primary_text}\n- **Description:** ${a.description}\n- **CTA:** ${a.cta}\n- **Audience:** ${a.audience}\n`);
  } else {
    L.push(`## ${content.campaign_name}\n\n${content.narrative}\n`);
    L.push(`## Hero content\n`, toMarkdown("content", content.content?.title ?? "Content", content.content));
    L.push(`## Distribution\n`, toMarkdown("distribution", "Distribution", content.distribution));
    L.push(`## Ads\n`, toMarkdown("ads", "Ads", content.ads));
  }
  return L.join("\n");
}

function MarketingWorkspace() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header>
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
          <Brain className="h-3.5 w-3.5" /> Founder Brain — Atlas marketing workspace
        </div>
        <h1 className="mt-2 font-display text-3xl">Head of Marketing, on call.</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Already knows Atlas. Remembers what you've shipped. Writes in your voice.
        </p>
      </header>

      <Tabs defaultValue="create" className="space-y-4">
        <TabsList>
          <TabsTrigger value="create"><Sparkles className="mr-1.5 h-3.5 w-3.5"/>Create</TabsTrigger>
          <TabsTrigger value="library"><FileText className="mr-1.5 h-3.5 w-3.5"/>Library</TabsTrigger>
          <TabsTrigger value="ideas"><Lightbulb className="mr-1.5 h-3.5 w-3.5"/>Inspiration</TabsTrigger>
          <TabsTrigger value="swipe"><ImageIcon className="mr-1.5 h-3.5 w-3.5"/>Swipe file</TabsTrigger>
        </TabsList>

        <TabsContent value="create"><CreatePanel /></TabsContent>
        <TabsContent value="library"><LibraryPanel /></TabsContent>
        <TabsContent value="ideas"><IdeasPanel /></TabsContent>
        <TabsContent value="swipe"><SwipePanel /></TabsContent>
      </Tabs>
    </div>
  );
}

function CreatePanel() {
  const qc = useQueryClient();
  const genFn = useServerFn(generateMarketing);
  const [kind, setKind] = useState<Kind>("content");
  const [campaign, setCampaign] = useState("General Brand Awareness");
  const [platform, setPlatform] = useState("LinkedIn");
  const [assetType, setAssetType] = useState("Post");
  const [tone, setTone] = useState("Founder");
  const [title, setTitle] = useState("");
  const [audience, setAudience] = useState("");
  const [brief, setBrief] = useState("");

  const gen = useMutation({
    mutationFn: () => genFn({ data: {
      kind, title, brief, campaign, platform, assetType, tone,
      channel: platform, audience: audience || undefined,
    }}),
    onSuccess: () => {
      toast.success("Saved to library");
      setBrief(""); setTitle("");
      qc.invalidateQueries({ queryKey: ["marketing-assets"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  return (
    <Card className="p-5">
      <div className="grid gap-4 md:grid-cols-4">
        <Field label="Campaign">
          <Select value={campaign} onValueChange={setCampaign}>
            <SelectTrigger><SelectValue/></SelectTrigger>
            <SelectContent>{CAMPAIGNS.map(c=><SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field label="Platform">
          <Select value={platform} onValueChange={setPlatform}>
            <SelectTrigger><SelectValue/></SelectTrigger>
            <SelectContent>{PLATFORMS.map(c=><SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field label="Asset type">
          <Select value={assetType} onValueChange={setAssetType}>
            <SelectTrigger><SelectValue/></SelectTrigger>
            <SelectContent>{ASSET_TYPES.map(c=><SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field label="Tone">
          <Select value={tone} onValueChange={setTone}>
            <SelectTrigger><SelectValue/></SelectTrigger>
            <SelectContent>{TONES.map(c=><SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
        </Field>

        <Field label="Output shape" hint="What kind of thing to build">
          <Select value={kind} onValueChange={(v)=>setKind(v as Kind)}>
            <SelectTrigger><SelectValue/></SelectTrigger>
            <SelectContent>
              <SelectItem value="content">Single piece</SelectItem>
              <SelectItem value="distribution">Distribution plan</SelectItem>
              <SelectItem value="ads">Ad variants</SelectItem>
              <SelectItem value="campaign">Full campaign</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Title (optional)"><Input value={title} onChange={e=>setTitle(e.target.value)} placeholder="e.g. Why simulations beat courses"/></Field>
        <Field label="Audience (optional)"><Input value={audience} onChange={e=>setAudience(e.target.value)} placeholder="e.g. Career switchers into PM"/></Field>
        <div />

        <div className="md:col-span-4">
          <Label>Prompt</Label>
          <Textarea className="mt-1 min-h-[140px]" value={brief} onChange={e=>setBrief(e.target.value)}
            placeholder="e.g. Create a LinkedIn carousel explaining why workplace simulations are better than online courses."/>
        </div>
      </div>
      <div className="mt-4 flex justify-end">
        <Button onClick={()=>gen.mutate()} disabled={gen.isPending || brief.trim().length<5}>
          {gen.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Sparkles className="mr-2 h-4 w-4"/>}
          Generate
        </Button>
      </div>
    </Card>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <Label>{label}</Label>
      {hint && <div className="text-[10px] text-muted-foreground mt-0.5">{hint}</div>}
      <div className="mt-1">{children}</div>
    </div>
  );
}

function LibraryPanel() {
  const qc = useQueryClient();
  const listFn = useServerFn(listMarketing);
  const delFn = useServerFn(deleteMarketing);
  const dupFn = useServerFn(duplicateMarketing);
  const { data: assets } = useQuery({ queryKey: ["marketing-assets"], queryFn: () => listFn() });
  const [q, setQ] = useState("");
  const [fCampaign, setFCampaign] = useState<string>("all");
  const [fPlatform, setFPlatform] = useState<string>("all");

  const filtered = useMemo(() => {
    return (assets ?? []).filter((a: any) => {
      if (fCampaign !== "all" && a.campaign !== fCampaign) return false;
      if (fPlatform !== "all" && a.platform !== fPlatform) return false;
      if (q) {
        const hay = `${a.title} ${a.brief} ${a.campaign ?? ""} ${a.platform ?? ""}`.toLowerCase();
        if (!hay.includes(q.toLowerCase())) return false;
      }
      return true;
    });
  }, [assets, q, fCampaign, fPlatform]);

  const del = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["marketing-assets"] }),
  });
  const dup = useMutation({
    mutationFn: (id: string) => dupFn({ data: { id } }),
    onSuccess: () => { toast.success("Duplicated"); qc.invalidateQueries({ queryKey: ["marketing-assets"] }); },
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-8" placeholder="Search library…" value={q} onChange={e=>setQ(e.target.value)} />
        </div>
        <Select value={fCampaign} onValueChange={setFCampaign}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="Campaign"/></SelectTrigger>
          <SelectContent><SelectItem value="all">All campaigns</SelectItem>{CAMPAIGNS.map(c=><SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={fPlatform} onValueChange={setFPlatform}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Platform"/></SelectTrigger>
          <SelectContent><SelectItem value="all">All platforms</SelectItem>{PLATFORMS.map(c=><SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      {filtered.length === 0 && (
        <p className="text-sm text-muted-foreground">Nothing here yet.</p>
      )}

      {filtered.map((a: any) => {
        const md = toMarkdown(a.kind, a.title, a.content);
        return (
          <Card key={a.id} className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  {a.campaign && <Badge variant="secondary">{a.campaign}</Badge>}
                  {a.platform && <Badge variant="outline">{a.platform}</Badge>}
                  {a.asset_type && <Badge variant="outline">{a.asset_type}</Badge>}
                  {a.tone && <Badge variant="outline">{a.tone}</Badge>}
                  <span className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString()}</span>
                </div>
                <h3 className="mt-1 font-display text-lg truncate">{a.title}</h3>
                <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{a.brief}</p>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button size="sm" variant="outline" onClick={()=>download(`${a.title}.md`, md)}><FileText className="mr-1.5 h-3.5 w-3.5"/>MD</Button>
                <Button size="sm" variant="outline" onClick={()=>download(`${a.title}.json`, JSON.stringify(a.content, null, 2), "application/json")}><Download className="mr-1.5 h-3.5 w-3.5"/>JSON</Button>
                <Button size="sm" variant="ghost" onClick={()=>dup.mutate(a.id)}><Copy className="h-3.5 w-3.5"/></Button>
                <Button size="sm" variant="ghost" onClick={()=>del.mutate(a.id)}><Trash2 className="h-3.5 w-3.5"/></Button>
              </div>
            </div>
            <pre className="mt-4 max-h-96 overflow-auto whitespace-pre-wrap rounded-md border border-border/60 bg-muted/40 p-3 text-xs leading-relaxed">{md}</pre>
          </Card>
        );
      })}
    </div>
  );
}

function IdeasPanel() {
  const genFn = useServerFn(generateIdeas);
  const [theme, setTheme] = useState("");
  const [count, setCount] = useState(20);
  const [ideas, setIdeas] = useState<any[]>([]);
  const run = useMutation({
    mutationFn: () => genFn({ data: { theme: theme || undefined, count } }),
    onSuccess: (r: any) => setIdeas(r?.ideas ?? []),
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });
  return (
    <Card className="p-5">
      <div className="flex flex-wrap gap-2 items-end">
        <div className="flex-1 min-w-[240px]">
          <Label>Theme (optional)</Label>
          <Input className="mt-1" value={theme} onChange={e=>setTheme(e.target.value)} placeholder="e.g. why simulations beat courses"/>
        </div>
        <div className="w-24">
          <Label>How many</Label>
          <Input type="number" min={10} max={30} className="mt-1" value={count} onChange={e=>setCount(Number(e.target.value)||20)}/>
        </div>
        <Button onClick={()=>run.mutate()} disabled={run.isPending}>
          {run.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Lightbulb className="mr-2 h-4 w-4"/>}
          Generate ideas
        </Button>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-2">
        {ideas.map((i, idx) => (
          <div key={idx} className="rounded-md border border-border/60 p-3">
            <div className="flex gap-2 mb-1 flex-wrap">
              <Badge variant="outline">{i.platform}</Badge>
              <Badge variant="secondary">{i.asset_type}</Badge>
            </div>
            <div className="font-medium text-sm">{i.title}</div>
            <div className="text-xs text-muted-foreground mt-1 italic">"{i.hook}"</div>
            <div className="text-xs mt-2 text-muted-foreground">{i.why_it_works}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function SwipePanel() {
  const qc = useQueryClient();
  const listFn = useServerFn(listSwipes);
  const analyseFn = useServerFn(analyseSwipe);
  const delFn = useServerFn(deleteSwipe);
  const { data: swipes } = useQuery({ queryKey: ["swipes"], queryFn: () => listFn() });
  const [title, setTitle] = useState("");
  const [source, setSource] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [notes, setNotes] = useState("");

  const add = useMutation({
    mutationFn: () => analyseFn({ data: { title, source: source || undefined, imageUrl: imageUrl || undefined, notes: notes || undefined } }),
    onSuccess: () => {
      toast.success("Analysed & saved"); setTitle(""); setSource(""); setImageUrl(""); setNotes("");
      qc.invalidateQueries({ queryKey: ["swipes"] });
    },
    onError: (e:any) => toast.error(e?.message ?? "Failed"),
  });
  const del = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["swipes"] }),
  });

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Title"><Input value={title} onChange={e=>setTitle(e.target.value)} placeholder="e.g. Superhuman's landing hero"/></Field>
          <Field label="Source (URL or brand)"><Input value={source} onChange={e=>setSource(e.target.value)} placeholder="linkedin.com/… or 'Linear'"/></Field>
          <Field label="Image URL (optional)"><Input value={imageUrl} onChange={e=>setImageUrl(e.target.value)} placeholder="https://…"/></Field>
          <Field label="Founder notes"><Input value={notes} onChange={e=>setNotes(e.target.value)} placeholder="What caught your eye?"/></Field>
        </div>
        <div className="mt-3 flex justify-end">
          <Button onClick={()=>add.mutate()} disabled={add.isPending || title.trim().length<2}>
            {add.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Sparkles className="mr-2 h-4 w-4"/>}
            Analyse & make an Atlas version
          </Button>
        </div>
      </Card>

      {(swipes ?? []).map((s: any) => (
        <Card key={s.id} className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs text-muted-foreground">{s.source ?? "—"} · {new Date(s.created_at).toLocaleString()}</div>
              <h3 className="font-display text-lg mt-0.5">{s.title}</h3>
              {s.notes && <p className="text-xs text-muted-foreground mt-1">{s.notes}</p>}
            </div>
            <Button size="sm" variant="ghost" onClick={()=>del.mutate(s.id)}><Trash2 className="h-3.5 w-3.5"/></Button>
          </div>
          {s.image_url && <img src={s.image_url} alt="" className="mt-3 max-h-64 rounded border border-border/60 object-contain"/>}
          {s.analysis && (
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">What makes it work</div>
                <ul className="text-sm space-y-1 list-disc pl-4">
                  {(s.analysis.what_makes_it_work ?? []).map((w: string, i: number)=><li key={i}>{w}</li>)}
                </ul>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Atlas version</div>
                <div className="text-sm italic mb-2">"{s.analysis.atlas_version?.hook}"</div>
                <pre className="whitespace-pre-wrap text-xs bg-muted/40 rounded p-3 border border-border/60">{s.analysis.atlas_version?.body_markdown}</pre>
                <div className="mt-2 flex gap-2">
                  <Badge variant="outline">{s.analysis.atlas_version?.platform}</Badge>
                  <Badge variant="secondary">{s.analysis.atlas_version?.asset_type}</Badge>
                </div>
              </div>
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}