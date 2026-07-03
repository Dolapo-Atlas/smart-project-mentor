import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getSkillMap } from "@/lib/workplace-skills.functions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Check, ArrowUpRight, Sparkles, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/app/workplace-tools")({
  head: () => ({
    meta: [
      { title: "Workplace Tools — Atlas" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: WorkplaceToolsPage,
});

const FAMILY_BLURB: Record<string, string> = {
  Jira: "Ticketing & agile boards — Jira, Azure DevOps, Linear",
  Confluence: "Documentation wikis — Confluence, Notion, SharePoint",
  Monday: "Project boards — Monday.com, Asana, ClickUp, Trello",
  "MS Project": "Schedule & planning — Microsoft Project, Smartsheet, Primavera",
  Teams: "Team chat & standups — Microsoft Teams, Slack",
  Outlook: "Executive email — Outlook, Gmail",
  RAID: "Risk, Assumption, Issue, Dependency management",
  Governance: "Change control & phase gates — PMO discipline",
  Agile: "Iterative delivery fundamentals",
};

function WorkplaceToolsPage() {
  const fetchMap = useServerFn(getSkillMap);
  const { data, isLoading } = useQuery({
    queryKey: ["workplace-skills"],
    queryFn: () => fetchMap(),
    refetchOnWindowFocus: false,
  });

  const pct = data ? Math.round((data.earnedCount / data.totalSkills) * 100) : 0;

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/50 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          <Sparkles className="h-3 w-3" /> Workplace Tools Layer
        </div>
        <h1 className="font-display text-3xl md:text-4xl tracking-tight">
          The tools you'll meet at work — practised here, first.
        </h1>
        <p className="max-w-2xl text-muted-foreground">
          Atlas doesn't rebrand Jira, Confluence, Monday.com or Microsoft Project. We teach the
          <em> workflow </em>behind them so that when you walk into a company using any of these tools
          you'll already recognise the pattern. Every activity you complete in Atlas maps to a skill
          below.
        </p>
      </header>

      <Card>
        <CardHeader className="flex-row items-end justify-between space-y-0">
          <div>
            <CardTitle className="font-display text-lg">Skills gained</CardTitle>
            <CardDescription>
              Practical familiarity, not certification. This is what you've actually done.
            </CardDescription>
          </div>
          <div className="text-right">
            <div className="font-display text-3xl">{data?.earnedCount ?? "—"}<span className="text-muted-foreground text-lg"> / {data?.totalSkills ?? "—"}</span></div>
            <div className="text-xs text-muted-foreground">{pct}% practised</div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
          </div>
        </CardContent>
      </Card>

      {isLoading && <p className="text-sm text-muted-foreground">Loading skill map…</p>}

      <div className="grid gap-5 md:grid-cols-2">
        {data?.families.map((fam) => (
          <Card key={fam.family} className="overflow-hidden">
            <CardHeader className="border-b bg-muted/30">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                    {fam.family}-style
                  </div>
                  <CardTitle className="mt-1 font-display text-lg">
                    {FAMILY_BLURB[fam.family] ?? fam.family}
                  </CardTitle>
                </div>
                <div className="shrink-0 rounded-md border border-border/60 bg-background px-2 py-1 text-xs">
                  {fam.earned}/{fam.total}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <ul className="divide-y">
                {fam.items.map((item) => (
                  <li key={item.key} className="flex items-start gap-3 px-5 py-4">
                    <span
                      className={cn(
                        "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
                        item.earned
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border text-muted-foreground",
                      )}
                    >
                      {item.earned ? <Check className="h-3 w-3" /> : <Circle className="h-2 w-2" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{item.label}</span>
                        {item.source === "practised" && item.times > 1 && (
                          <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">
                            ×{item.times}
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">{item.description}</p>
                      {item.atlasRoute && (
                        <Link
                          to={item.atlasRoute}
                          className="mt-1.5 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                        >
                          Practise in Atlas · {item.atlasFeature}
                          <ArrowUpRight className="h-3 w-3" />
                        </Link>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-dashed">
        <CardContent className="p-6 text-sm text-muted-foreground">
          <p className="mb-2 font-medium text-foreground">Why this layer exists</p>
          <p>
            The goal is not to become Jira, Monday.com or Confluence — it's to make sure that the
            first time you meet those tools in a real job, the workflow feels familiar. More tool
            families (Azure DevOps, Trello, ClickUp, Smartsheet, Notion, ServiceNow, Salesforce, SAP,
            Oracle, Power BI, Microsoft Planner) will slot into this map as Atlas grows.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
