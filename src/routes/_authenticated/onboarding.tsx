import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { completeOnboarding } from "@/lib/sim.functions";
import { trackLearner } from "@/lib/learner-events";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { OnboardingSteps } from "@/components/onboarding/onboarding-steps";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({
    meta: [{ title: "Welcome to Atlas" }],
  }),
  component: Onboarding,
});

const CAREER_GOALS = [
  "Project Coordinator",
  "Project Support Officer",
  "Project Officer",
  "Project Support Analyst",
] as const;

function Onboarding() {
  const navigate = useNavigate();
  const submit = useServerFn(completeOnboarding);
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    preferred_name: "",
    country: "",
    career_goal: "Project Coordinator" as (typeof CAREER_GOALS)[number],
  });

  const mut = useMutation({
    mutationFn: () => submit({ data: form }),
    onSuccess: () => {
      trackLearner("role_selected", { props: { role: form.career_goal } });
      navigate({ to: "/orientation" });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save profile"),
  });

  useEffect(() => {
    trackLearner("onboarding_started");
  }, []);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.first_name.trim() || !form.last_name.trim()) {
      toast.error("Please complete all required fields");
      return;
    }
    mut.mutate();
  }

  return (
    <div className="min-h-screen bg-background paper-texture">
      <main className="mx-auto max-w-2xl px-6 py-16">
        <OnboardingSteps current={1} />
        <div className="mt-6 text-xs uppercase tracking-[0.22em] text-muted-foreground">
          Employee onboarding
        </div>
        <h1 className="mt-2 font-display text-5xl font-medium tracking-tight">
          Welcome to Atlas
        </h1>
        <p className="mt-3 text-base text-muted-foreground">
          Before you begin your first assignment, tell us a little about yourself.
        </p>

        <form
          onSubmit={onSubmit}
          className="mt-10 space-y-6 rounded-xl border border-border bg-card p-8 shadow-sm"
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="first_name">First name</Label>
              <Input
                id="first_name"
                required
                maxLength={80}
                value={form.first_name}
                onChange={(e) => setForm({ ...form, first_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">Last name</Label>
              <Input
                id="last_name"
                required
                maxLength={80}
                value={form.last_name}
                onChange={(e) => setForm({ ...form, last_name: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="preferred_name">
              Preferred name <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="preferred_name"
              maxLength={80}
              placeholder="What should colleagues call you?"
              value={form.preferred_name}
              onChange={(e) => setForm({ ...form, preferred_name: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="country">Country</Label>
            <Input
              id="country"
              maxLength={80}
              placeholder="Optional"
              value={form.country}
              onChange={(e) => setForm({ ...form, country: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              Optional — it only sets your local pricing later on.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="career_goal">Your role on this project</Label>
            <Select
              value={form.career_goal}
              onValueChange={(v) =>
                setForm({ ...form, career_goal: v as (typeof CAREER_GOALS)[number] })
              }
            >
              <SelectTrigger id="career_goal">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CAREER_GOALS.map((g) => (
                  <SelectItem key={g} value={g}>
                    {g}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              You'll join as a {form.career_goal}. Only how the team addresses you
              changes — the tasks and stakeholders are the same for every role.
            </p>
          </div>

          <Button type="submit" disabled={mut.isPending} className="w-full">
            {mut.isPending ? "Setting up your workspace…" : "Continue"}
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Next: a short orientation, then you choose your project. Nothing starts
            until you say so.
          </p>
        </form>
      </main>
    </div>
  );
}