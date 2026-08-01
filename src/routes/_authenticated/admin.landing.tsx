import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getLandingAdmin, updateLandingSettings } from "@/lib/landing.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/admin/landing")({
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
  head: () => ({
    meta: [
      { title: "Sales page controls | Atlas admin" },
      {
        name: "description",
        content: "Manage Atlas Project Readiness pricing, founding places, campaign variant and enrolment status.",
      },
      { property: "og:title", content: "Sales page controls | Atlas admin" },
      { property: "og:description", content: "Pricing, places and enrolment controls for the Atlas sales page." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminLanding,
});

type Form = {
  price_ngn: number;
  price_inr: number;
  price_usd: number;
  founding_places: number;
  hero_variant: "interview" | "confidence" | "credential";
  video_url: string;
  enrolment_open: boolean;
  checkout_note: string;
};

function AdminLanding() {
  const fetchAdmin = useServerFn(getLandingAdmin);
  const save = useServerFn(updateLandingSettings);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["landing-admin"], queryFn: () => fetchAdmin() });
  const [form, setForm] = useState<Form | null>(null);

  useEffect(() => {
    const s = q.data?.settings;
    if (!s || form) return;
    setForm({
      price_ngn: s.price_ngn,
      price_inr: s.price_inr,
      price_usd: s.price_usd,
      founding_places: s.founding_places,
      hero_variant: (s.hero_variant as Form["hero_variant"]) ?? "interview",
      video_url: s.video_url ?? "",
      enrolment_open: s.enrolment_open,
      checkout_note: s.checkout_note ?? "",
    });
  }, [q.data, form]);

  const mutation = useMutation({
    mutationFn: (f: Form) =>
      save({
        data: {
          ...f,
          video_url: f.video_url.trim() || null,
          checkout_note: f.checkout_note.trim() || null,
        },
      }),
    onSuccess: () => {
      toast.success("Sales page settings saved");
      qc.invalidateQueries({ queryKey: ["landing-admin"] });
      qc.invalidateQueries({ queryKey: ["public-offer"] });
    },
    onError: () => toast.error("Could not save settings"),
  });

  if (q.isLoading || !form) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const enrolments = q.data?.enrolments ?? [];
  const funnel = q.data?.funnel ?? [];
  const top = funnel[0]?.value || 1;
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm({ ...form, [k]: v });

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-medium">Sales page controls</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Live settings for /project-readiness — prices, places, campaign variant and enrolment.
          </p>
        </div>
        <Link to="/admin/tracking" className="text-sm font-medium text-primary underline-offset-4 hover:underline">
          Learner tracking →
        </Link>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pricing and availability</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="ngn">Nigeria (₦)</Label>
                <Input
                  id="ngn"
                  type="number"
                  value={form.price_ngn}
                  onChange={(e) => set("price_ngn", Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="inr">India (₹)</Label>
                <Input
                  id="inr"
                  type="number"
                  value={form.price_inr}
                  onChange={(e) => set("price_inr", Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="usd">Default ($)</Label>
                <Input
                  id="usd"
                  type="number"
                  value={form.price_usd}
                  onChange={(e) => set("price_usd", Number(e.target.value))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="places">Founding-user places per market</Label>
              <Input
                id="places"
                type="number"
                value={form.founding_places}
                onChange={(e) => set("founding_places", Number(e.target.value))}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
              <div>
                <p className="text-sm font-medium">Enrolment open</p>
                <p className="text-xs text-muted-foreground">
                  When off, purchase buttons become “Join the Waitlist”.
                </p>
              </div>
              <Switch
                checked={form.enrolment_open}
                onCheckedChange={(v) => set("enrolment_open", v)}
                aria-label="Toggle enrolment"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Campaign content</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Default headline variant</Label>
              <Select
                value={form.hero_variant}
                onValueChange={(v) => set("hero_variant", v as Form["hero_variant"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="interview">A · Interview readiness</SelectItem>
                  <SelectItem value="confidence">B · Practical confidence</SelectItem>
                  <SelectItem value="credential">C · Verified simulated experience</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Ads can override this with ?variant=interview | confidence | credential.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="video">Product video URL (MP4/WebM)</Label>
              <Input
                id="video"
                value={form.video_url}
                placeholder="Leave blank to show the live product demo"
                onChange={(e) => set("video_url", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="note">Checkout note (optional)</Label>
              <Input
                id="note"
                value={form.checkout_note}
                onChange={(e) => set("checkout_note", e.target.value)}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <Button
        className="mt-6"
        size="lg"
        onClick={() => mutation.mutate(form)}
        disabled={mutation.isPending}
      >
        {mutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Save settings
      </Button>

      <div className="mt-10 rounded-xl border border-border bg-card p-5">
        <h2 className="font-medium">Conversion funnel</h2>
        <div className="mt-4 space-y-3">
          {funnel.map((f) => (
            <div key={f.label}>
              <div className="flex items-baseline justify-between text-sm">
                <span>{f.label}</span>
                <span className="text-muted-foreground">
                  {f.value} · {Math.round((f.value / top) * 100)}%
                </span>
              </div>
              <div className="mt-1 h-2 rounded-full bg-muted">
                <div
                  className="h-2 rounded-full bg-primary"
                  style={{ width: `${Math.max(2, (f.value / top) * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-10 overflow-x-auto rounded-xl border border-border bg-card">
        <div className="border-b border-border px-4 py-3">
          <h2 className="font-medium">Enrolments</h2>
          <p className="text-xs text-muted-foreground">Latest 200 checkout attempts</p>
        </div>
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Market</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Source</th>
              <th className="px-4 py-3">Started</th>
            </tr>
          </thead>
          <tbody>
            {enrolments.map((e: any) => (
              <tr key={e.id} className="border-t border-border">
                <td className="px-4 py-3 font-medium">{e.full_name ?? "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">{e.email}</td>
                <td className="px-4 py-3 text-muted-foreground">{e.country}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {e.currency} {Number(e.amount).toLocaleString()}
                </td>
                <td className="px-4 py-3">{e.status}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {e.utm?.utm_source ?? e.utm?.utm_campaign ?? "direct"}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {new Date(e.created_at).toLocaleString()}
                </td>
              </tr>
            ))}
            {!enrolments.length && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                  No enrolments yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}