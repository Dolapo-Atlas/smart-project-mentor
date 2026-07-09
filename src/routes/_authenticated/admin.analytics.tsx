import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { getAdminAnalytics } from "@/lib/analytics.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/analytics")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
    const { data: row } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", data.user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!row) throw redirect({ to: "/app" });
  },
  component: AdminAnalytics,
});

function AdminAnalytics() {
  const fetchAnalytics = useServerFn(getAdminAnalytics);
  const q = useQuery({
    queryKey: ["admin-analytics"],
    queryFn: () => fetchAnalytics(),
    refetchInterval: 30_000,
  });

  if (q.isLoading || !q.data) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const { totals, recent } = q.data;

  const stats: Array<{ label: string; value: string | number }> = [
    { label: "Total users", value: totals.users },
    { label: "New today", value: totals.newToday },
    { label: "Active (24h)", value: totals.active24h },
    { label: "Simulations started", value: totals.simsStarted },
    { label: "Simulations completed", value: totals.simsCompleted },
    { label: "Avg completion rate", value: `${totals.completionRate}%` },
    { label: "Feedback submitted", value: totals.feedback },
  ];

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div>
        <h1 className="font-display text-3xl font-medium">Admin analytics</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Beta activity overview. Refreshes every 30 seconds.
        </p>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {s.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold">{s.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-10 overflow-hidden rounded-xl border border-border bg-card">
        <div className="border-b border-border px-4 py-3">
          <h2 className="font-medium">Recent users</h2>
          <p className="text-xs text-muted-foreground">Latest 50 by last login</p>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Country</th>
              <th className="px-4 py-3">Signed up</th>
              <th className="px-4 py-3">Last login</th>
              <th className="px-4 py-3">Last active</th>
            </tr>
          </thead>
          <tbody>
            {recent.map((u: any) => (
              <tr key={u.id} className="border-t border-border">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {u.avatar_url ? (
                      <img src={u.avatar_url} alt="" className="h-7 w-7 rounded-full object-cover" />
                    ) : (
                      <div className="h-7 w-7 rounded-full bg-muted" />
                    )}
                    <span className="font-medium">{u.display_name ?? "—"}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{u.email ?? "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">{u.country ?? "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {u.sign_up_at ? new Date(u.sign_up_at).toLocaleString() : "—"}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {u.last_login_at ? new Date(u.last_login_at).toLocaleString() : "—"}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {u.last_active_at ? new Date(u.last_active_at).toLocaleString() : "—"}
                </td>
              </tr>
            ))}
            {!recent.length && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                  No users yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}