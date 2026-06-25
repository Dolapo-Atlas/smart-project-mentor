import { createFileRoute, Link, Outlet, useNavigate, useRouter, useRouterState } from "@tanstack/react-router";
import { Mail, ListChecks, FileText, Gauge, LayoutDashboard, LogOut, ArrowLeft, ShieldAlert, FileBarChart2, Wallet, GitPullRequest, Gavel, Users, Send, Compass, Contact, CheckCircle2, Settings, FolderKanban } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getOverview } from "@/lib/sim.functions";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app")({
  component: AppLayout,
});

type NavItem = { to: string; label: string; icon: typeof Mail; exact?: boolean };
const NAV: NavItem[] = [
  { to: "/app", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/app/inbox", label: "Inbox", icon: Mail },
  { to: "/app/comms", label: "Comms", icon: Send },
  { to: "/app/meetings", label: "Meetings", icon: Users },
  { to: "/app/stakeholders", label: "Stakeholders", icon: Contact },
  { to: "/app/tasks", label: "Tasks", icon: ListChecks },
  { to: "/app/completed", label: "Completed", icon: CheckCircle2 },
  { to: "/app/documents", label: "Documents", icon: FileText },
  { to: "/app/reports", label: "Status reports", icon: FileBarChart2 },
  { to: "/app/budget", label: "Budget", icon: Wallet },
  { to: "/app/changes", label: "Change requests", icon: GitPullRequest },
  { to: "/app/gates", label: "Phase gates", icon: Gavel },
  { to: "/app/risk", label: "Risk & RAG", icon: ShieldAlert },
  { to: "/app/progress", label: "Progress", icon: Gauge },
  { to: "/app/learning", label: "Learning", icon: Compass },
  { to: "/app/settings", label: "Settings", icon: Settings },
];

function AppLayout() {
  const navigate = useNavigate();
  const router = useRouter();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const fetchOverview = useServerFn(getOverview);
  const { data: overview } = useQuery({
    queryKey: ["overview"],
    queryFn: () => fetchOverview(),
    refetchInterval: 15000,
  });

  async function signOut() {
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate({ to: "/auth" });
  }

  const isActive = (to: string, exact?: boolean) =>
    exact ? pathname === to : pathname === to || pathname.startsWith(to + "/");

  return (
    <div className="min-h-screen bg-background text-foreground paper-texture">
      <div className="mx-auto grid min-h-screen max-w-[1400px] grid-cols-1 md:grid-cols-[260px_1fr]">
        <aside className="border-b border-border bg-sidebar/60 px-5 py-6 md:border-b-0 md:border-r">
          <Link to="/app" className="font-display text-2xl font-semibold tracking-tight">
            Atlas <span className="text-primary">/</span>
          </Link>
          <div className="mt-1 text-xs uppercase tracking-[0.18em] text-muted-foreground">
            {overview?.state?.project_name ?? "Loading…"}
          </div>

          <Link
            to="/app/projects"
            className="mt-3 flex items-center justify-between gap-2 rounded-md border border-dashed border-border bg-card/60 px-3 py-2 text-xs text-foreground/80 transition hover:border-primary hover:text-foreground"
          >
            <span className="flex items-center gap-1.5">
              <FolderKanban className="h-3.5 w-3.5" /> Switch project
            </span>
            <ArrowLeft className="h-3 w-3 rotate-180 opacity-50" />
          </Link>

          <nav className="mt-8 grid grid-cols-3 gap-2">
            {NAV.map(({ to, label, icon: Icon, exact }) => {
              const active = isActive(to, exact);
              const badge =
                to === "/app/inbox"
                  ? overview?.unread
                  : to === "/app/tasks"
                  ? overview?.openTasks
                  : to === "/app/documents"
                  ? overview?.docs
                  : undefined;
              return (
                <Link
                  key={to}
                  to={to}
                  className={`relative flex aspect-square flex-col items-center justify-center gap-1.5 rounded-md p-2 text-center text-[11px] leading-tight transition ${
                    active
                      ? "bg-foreground text-background"
                      : "text-foreground/80 hover:bg-accent hover:text-foreground"
                  }`}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  <span className="line-clamp-2">{label}</span>
                  {badge ? (
                    <span
                      className={`absolute right-1 top-1 min-w-[18px] rounded-full px-1.5 py-0.5 text-center text-[10px] font-medium ${
                        active ? "bg-background/20 text-background" : "bg-primary/15 text-primary"
                      }`}
                    >
                      {badge}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </nav>

          <div className="mt-10 rounded-md border border-border bg-card p-4">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Phase</div>
            <div className="mt-1 font-display text-lg capitalize">
              {overview?.state?.phase ?? "—"}
            </div>
            <div className="mt-3 text-xs text-muted-foreground">Progress</div>
            <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${overview?.state?.progress ?? 0}%` }}
              />
            </div>
            <div className="mt-1 text-right text-xs text-muted-foreground">
              {overview?.state?.progress ?? 0}%
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={signOut}
            className="mt-6 w-full justify-start text-muted-foreground"
          >
            <LogOut className="mr-2 h-4 w-4" /> Sign out
          </Button>
        </aside>

        <main className="px-6 py-8 md:px-10 md:py-12">
          {pathname !== "/app" && (
            <button
              type="button"
              onClick={() => router.history.back()}
              className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
          )}
          <Outlet />
        </main>
      </div>
    </div>
  );
}