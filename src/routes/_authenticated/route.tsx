import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { recordSession } from "@/lib/session.functions";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });

    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarded")
      .eq("id", data.user.id)
      .maybeSingle();

    const path = location.pathname;
    const onOnboarding = path.startsWith("/onboarding");
    const onWelcome = path.startsWith("/welcome");

    if (!profile?.onboarded && !onOnboarding) {
      throw redirect({ to: "/onboarding" });
    }
    if (profile?.onboarded && onOnboarding) {
      throw redirect({ to: "/app/projects" });
    }
    if (onWelcome) {
      throw redirect({ to: "/app/projects" });
    }
    return { user: data.user };
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const record = useServerFn(recordSession);
  useEffect(() => {
    record().catch(() => {});
  }, [record]);
  return <Outlet />;
}