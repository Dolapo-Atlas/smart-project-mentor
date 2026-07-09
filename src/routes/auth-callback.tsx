import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { getActiveProject } from "@/lib/projects.functions";

export const Route = createFileRoute("/auth-callback")({
  component: AuthCallback,
});

function AuthCallback() {
  const navigate = useNavigate();
  const fetchActiveProject = useServerFn(getActiveProject);

  useEffect(() => {
    let done = false;

    const sendToAuth = () => {
      if (done) return;
      done = true;
      sessionStorage.removeItem("oauth_pending");
      navigate({ to: "/auth", replace: true });
    };

    const routeUser = async (
      user: NonNullable<Awaited<ReturnType<typeof supabase.auth.getUser>>["data"]["user"]>,
    ) => {
      if (done) return;
      done = true;

      sessionStorage.removeItem("oauth_intent");
      sessionStorage.removeItem("oauth_pending");

      let hasActiveProject = false;
      try {
        hasActiveProject = !!(await fetchActiveProject());
      } catch {
        hasActiveProject = false;
      }

      navigate({ to: hasActiveProject ? "/app" : "/app/projects", replace: true });
    };

    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) void routeUser(data.session.user);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === "SIGNED_IN" || event === "INITIAL_SESSION") && session?.user) {
        void routeUser(session.user);
      }
    });

    const timer = window.setTimeout(sendToAuth, 5000);
    return () => {
      done = true;
      window.clearTimeout(timer);
      sub.subscription.unsubscribe();
    };
  }, [fetchActiveProject, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background paper-texture px-6 text-center">
      <div className="w-full max-w-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-primary/30 bg-primary/10">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
        <h1 className="mt-6 font-display text-3xl font-semibold tracking-tight text-foreground">Atlas</h1>
        <p className="mt-2 text-sm text-muted-foreground">Preparing your workspace…</p>
      </div>
    </div>
  );
}