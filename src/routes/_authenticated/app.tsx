import { createFileRoute, Link, Outlet, useNavigate, useRouter, useRouterState } from "@tanstack/react-router";
import { Mail, ListChecks, FileText, Gauge, LayoutDashboard, LogOut, ArrowLeft, ShieldAlert, FileBarChart2, Wallet, GitPullRequest, Gavel, Users, Send, Compass, Contact, CheckCircle2, Settings, FolderKanban, Award, Activity } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getOverview } from "@/lib/sim.functions";
import { getActiveProject } from "@/lib/projects.functions";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { GuidedTour } from "@/components/guided-tour";
import { LearningDrawer } from "@/components/learning-drawer";
import { NotificationsBell } from "@/components/notifications-bell";
import { Coffee } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app")({
  component: AppLayout,
});

type NavItem = { to: string; label: string; icon: typeof Mail; exact?: boolean; tour?: string };
const NAV: NavItem[] = [
  { to: "/app", label: "Dashboard", icon: LayoutDashboard, exact: true, tour: "dashboard" },
  { to: "/app/inbox", label: "Inbox", icon: Mail, tour: "inbox" },
  { to: "/app/comms", label: "Comms", icon: Send },
  { to: "/app/meetings", label: "Meetings", icon: Users },
  { to: "/app/stakeholders", label: "Stakeholders", icon: Contact, tour: "stakeholders" },
  { to: "/app/tasks", label: "Tasks", icon: ListChecks, tour: "tasks" },
  { to: "/app/completed", label: "Completed", icon: CheckCircle2 },
  { to: "/app/documents", label: "Documents", icon: FileText, tour: "documents" },
  { to: "/app/reports", label: "Status reports", icon: FileBarChart2 },
  { to: "/app/budget", label: "Budget", icon: Wallet },
  { to: "/app/changes", label: "Change requests", icon: GitPullRequest },
  { to: "/app/gates", label: "Phase gates", icon: Gavel },
  { to: "/app/raid", label: "RAID Log", icon: ShieldAlert },
  { to: "/app/health", label: "Project Health", icon: Activity },
  { to: "/app/progress", label: "Progress", icon: Gauge },
  { to: "/app/reviews", label: "Reviews", icon: Award },
  { to: "/app/learning", label: "Learning", icon: Compass, tour: "learning" },
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
  const fetchActive = useServerFn(getActiveProject);
  const { data: active, isLoading: activeLoading } = useQuery({
    queryKey: ["active-project"],
    queryFn: () => fetchActive(),
  });

  useEffect(() => {
    if (activeLoading) return;
    if (active) return;
    if (pathname === "/app/projects" || pathname.startsWith("/app/projects/")) return;
    navigate({ to: "/app/projects" });
  }, [active, activeLoading, pathname, navigate]);

  const [tourDismissed, setTourDismissed] = useState(false);
  const activeAny = active as any;
  const showTour =
    !!activeAny?.id &&
    !!activeAny?.intro_seen_at &&
    !activeAny?.tour_completed_at &&
    !tourDismissed;

  // One-time "Grab a coffee" intermission per project instance.
  const [showCoffee, setShowCoffee] = useState(false);
  useEffect(() => {
    if (!activeAny?.id || !activeAny?.intro_seen_at) return;
    if (typeof window === "undefined") return;
    const key = `atlas-coffee-seen-${activeAny.id}`;
    if (!window.localStorage.getItem(key)) setShowCoffee(true);
  }, [activeAny?.id, activeAny?.intro_seen_at]);
  function dismissCoffee() {
    if (activeAny?.id) {
      window.localStorage.setItem(`atlas-coffee-seen-${activeAny.id}`, "1");
    }
    setShowCoffee(false);
    navigate({ to: "/app/inbox" });
  }


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

          <div className="mt-3 flex items-center gap-2">
            <Link
              to="/app/projects"
              className="flex flex-1 items-center justify-between gap-2 rounded-md border border-dashed border-border bg-card/60 px-3 py-2 text-xs text-foreground/80 transition hover:border-primary hover:text-foreground"
            >
              <span className="flex items-center gap-1.5">
                <FolderKanban className="h-3.5 w-3.5" /> Switch project
              </span>
              <ArrowLeft className="h-3 w-3 rotate-180 opacity-50" />
            </Link>
            <NotificationsBell />
          </div>

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
                  data-tour={NAV.find((n) => n.to === to)?.tour}
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
      {showTour && !showCoffee && (
        <GuidedTour
          instanceId={activeAny.id}
          onDone={() => setTourDismissed(true)}
        />
      )}
      {active && <LearningDrawer />}
      {showCoffee && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background/95 backdrop-blur-sm animate-in fade-in duration-500">
          <div className="w-full max-w-lg px-8 text-center">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-border bg-card">
              <Coffee className="h-9 w-9 text-primary animate-pulse" />
            </div>
            <div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
              Before you begin
            </div>
            <h2 className="mt-3 font-display text-3xl font-medium tracking-tight md:text-4xl">
              Grab a coffee ☕
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
              Take a breath. Your first day at{" "}
              <span className="text-foreground">
                {activeAny?.display_name ?? activeAny?.project_templates?.title ?? "your project"}
              </span>{" "}
              is about to start. Emma's welcome note and your first objectives are waiting in the inbox.
            </p>
            <div className="mt-8 flex justify-center">
              <Button size="lg" onClick={dismissCoffee}>
                I'm ready — let's go
              </Button>
            </div>
            <div className="mt-4 text-xs text-muted-foreground">
              Tip: This sim runs at your pace. Nothing happens until you act.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}