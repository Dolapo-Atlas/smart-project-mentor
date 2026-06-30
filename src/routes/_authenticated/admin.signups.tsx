import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Download, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { approveSignup, listAllowlist } from "@/lib/admin.functions";

const ADMIN_EMAILS = [
  "rasaqdolapo@gmail.com",
  "fuhad.dolapo@gmail.com",
];

type Signup = {
  id: string;
  name: string;
  email: string;
  desired_role: string;
  country: string | null;
  experience_level: string | null;
  created_at: string;
};

export const Route = createFileRoute("/_authenticated/admin/signups")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    const email = data.user?.email?.toLowerCase();
    if (!email || !ADMIN_EMAILS.includes(email)) {
      throw redirect({ to: "/app" });
    }
  },
  component: SignupsAdmin,
});

function SignupsAdmin() {
  const [rows, setRows] = useState<Signup[]>([]);
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState<Set<string>>(new Set());
  const [approving, setApproving] = useState<string | null>(null);
  const approve = useServerFn(approveSignup);
  const fetchAllow = useServerFn(listAllowlist);

  useEffect(() => {
    supabase
      .from("early_access_signups")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) toast.error(error.message);
        else setRows((data ?? []) as Signup[]);
        setLoading(false);
      });
    fetchAllow()
      .then((emails) => setAllowed(new Set(emails)))
      .catch(() => {});
  }, [fetchAllow]);

  async function handleApprove(email: string) {
    setApproving(email);
    try {
      await approve({ data: { email } });
      setAllowed((prev) => new Set(prev).add(email.toLowerCase()));
      toast.success(`${email} can now sign in`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to approve");
    } finally {
      setApproving(null);
    }
  }

  function downloadCsv() {
    const headers = ["created_at", "name", "email", "desired_role", "country", "experience_level"];
    const escape = (v: unknown) => {
      const s = v == null ? "" : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csv = [
      headers.join(","),
      ...rows.map((r) => headers.map((h) => escape((r as any)[h])).join(",")),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `atlas-early-access-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-medium">Early access signups</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {loading ? "Loading…" : `${rows.length} total`}
          </p>
        </div>
        <Button onClick={downloadCsv} disabled={!rows.length}>
          <Download className="mr-2 h-4 w-4" /> Download CSV
        </Button>
      </div>

      <div className="mt-8 overflow-hidden rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Country</th>
              <th className="px-4 py-3">Experience</th>
              <th className="px-4 py-3">Access</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-border">
                <td className="px-4 py-3 text-muted-foreground">
                  {new Date(r.created_at).toLocaleString()}
                </td>
                <td className="px-4 py-3 font-medium">{r.name}</td>
                <td className="px-4 py-3">
                  <a href={`mailto:${r.email}`} className="text-primary hover:underline">
                    {r.email}
                  </a>
                </td>
                <td className="px-4 py-3">{r.desired_role}</td>
                <td className="px-4 py-3 text-muted-foreground">{r.country ?? "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">{r.experience_level ?? "—"}</td>
                <td className="px-4 py-3">
                  {allowed.has(r.email.toLowerCase()) ? (
                    <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
                      <Check className="h-3.5 w-3.5" /> Approved
                    </span>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={approving === r.email}
                      onClick={() => handleApprove(r.email)}
                    >
                      {approving === r.email ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        "Approve"
                      )}
                    </Button>
                  )}
                </td>
              </tr>
            ))}
            {!loading && !rows.length && (
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