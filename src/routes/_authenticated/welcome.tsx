import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getProfile, getOverview } from "@/lib/sim.functions";
import { Button } from "@/components/ui/button";
import { ArrowRight, Mail, CalendarClock, Building2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/welcome")({
  head: () => ({
    meta: [{ title: "Employee Portal — Atlas" }],
  }),
  component: Welcome,
});

function Welcome() {
  const navigate = useNavigate();
  const fetchProfile = useServerFn(getProfile);
  const fetchOverview = useServerFn(getOverview);
  const { data: profile } = useQuery({ queryKey: ["profile"], queryFn: () => fetchProfile() });
  const { data: overview } = useQuery({ queryKey: ["overview"], queryFn: () => fetchOverview() });

  const [phase, setPhase] = useState<"loading" | "ready">("loading");
  const [dots, setDots] = useState(".");

  useEffect(() => {
    const t = setTimeout(() => setPhase("ready"), 2200);
    const i = setInterval(() => setDots((d) => (d.length >= 3 ? "." : d + ".")), 350);
    return () => {
      clearTimeout(t);
      clearInterval(i);
    };
  }, []);

  const firstName = profile?.preferred_name?.trim() || profile?.first_name || "there";
  const unread = overview?.unread ?? 1;

  return (
    <div className="min-h-screen bg-background paper-texture">
      <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-6 py-16">
        {phase === "loading" ? (
          <div className="w-full max-w-md text-center">
            <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
              Northbridge Health Services
            </div>
            <h1 className="mt-4 font-display text-3xl font-medium">
              Employee Portal Loading{dots}
            </h1>
            <div className="mx-auto mt-8 h-1 w-full max-w-xs overflow-hidden rounded-full bg-muted">
              <div className="h-full w-1/2 animate-pulse bg-primary" />
            </div>
            <div className="mt-6 space-y-1 text-xs text-muted-foreground">
              <div>Authenticating with HR systems…</div>
              <div>Loading project assignment…</div>
              <div>Syncing inbox…</div>
            </div>
          </div>
        ) : (
          <div className="w-full">
            <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
              Northbridge Health Services · Employee Portal
            </div>
            <h1 className="mt-3 font-display text-5xl font-medium tracking-tight">
              Welcome, {firstName}.
            </h1>
            <p className="mt-4 max-w-xl text-base text-muted-foreground">
              Northbridge Health Services has assigned you to a live project. Your
              workspace is ready.
            </p>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg border border-border bg-card p-5">
                <Building2 className="h-5 w-5 text-primary" />
                <div className="mt-3 text-xs uppercase tracking-widest text-muted-foreground">
                  Project
                </div>
                <div className="mt-1 font-display text-lg leading-tight">
                  Digital Care Records Rollout
                </div>
              </div>
              <div className="rounded-lg border border-border bg-card p-5">
                <Mail className="h-5 w-5 text-primary" />
                <div className="mt-3 text-xs uppercase tracking-widest text-muted-foreground">
                  Inbox
                </div>
                <div className="mt-1 font-display text-lg leading-tight">
                  {unread} unread message{unread === 1 ? "" : "s"}
                </div>
              </div>
              <div className="rounded-lg border border-border bg-card p-5">
                <CalendarClock className="h-5 w-5 text-primary" />
                <div className="mt-3 text-xs uppercase tracking-widest text-muted-foreground">
                  First governance review
                </div>
                <div className="mt-1 font-display text-lg leading-tight">In 4 days</div>
              </div>
            </div>

            <div className="mt-10 rounded-lg border border-dashed border-border bg-card/60 p-6">
              <div className="text-xs uppercase tracking-widest text-muted-foreground">
                Employee record
              </div>
              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-muted-foreground">Name</dt>
                  <dd className="font-medium">
                    {profile?.first_name} {profile?.last_name}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Role</dt>
                  <dd className="font-medium">{profile?.role}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Manager</dt>
                  <dd className="font-medium">{profile?.manager}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Start date</dt>
                  <dd className="font-medium">{profile?.start_date ?? "Today"}</dd>
                </div>
              </dl>
            </div>

            <div className="mt-10 flex justify-center">
              <Button
                size="lg"
                onClick={() => navigate({ to: "/app/inbox" })}
                className="px-8"
              >
                Enter Workplace
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}