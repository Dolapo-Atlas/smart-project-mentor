import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { listEarlySignups } from "@/lib/analytics.functions";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/signups")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Early access signups — Atlas admin" },
      { name: "description", content: "Internal list of Atlas early access signups." },
      { name: "robots", content: "noindex" },
    ],
  }),
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
  component: AdminSignups,
});

function AdminSignups() {
  const fetchSignups = useServerFn(listEarlySignups);
  const q = useQuery({
    queryKey: ["admin-early-signups"],
    queryFn: () => fetchSignups(),
    refetchInterval: 60_000,
  });

  if (q.isLoading || !q.data) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const { total, rows } = q.data;

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="font-display text-3xl font-medium">Early access signups</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {total} total signup{total === 1 ? "" : "s"}. Newest first.
      </p>

      <div className="mt-8 overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Desired role</th>
              <th className="px-4 py-3">Country</th>
              <th className="px-4 py-3">Experience</th>
              <th className="px-4 py-3">Referral</th>
              <th className="px-4 py-3">Signed up</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r: any) => (
              <tr key={r.id} className="border-t border-border">
                <td className="px-4 py-3 font-medium">{r.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{r.email}</td>
                <td className="px-4 py-3 text-muted-foreground">{r.desired_role}</td>
                <td className="px-4 py-3 text-muted-foreground">{r.country ?? "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">{r.experience_level ?? "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {r.referral_code ?? "—"}
                  {r.referred_by_code ? ` (via ${r.referred_by_code})` : ""}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {new Date(r.created_at).toLocaleString()}
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                  No signups yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}