import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Atlas" },
      { name: "description", content: "Sign in to begin your project coordinator simulation." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const intent = sessionStorage.getItem("oauth_intent");
      if (intent === "signup") {
        sessionStorage.removeItem("oauth_intent");
        const createdAt = new Date(data.user.created_at ?? 0).getTime();
        const isNew = Date.now() - createdAt < 60_000;
        if (!isNew) {
          await supabase.auth.signOut();
          toast.error("That Google account is already registered. Sign in instead.");
          setMode("signin");
          return;
        }
      }
      navigate({ to: "/app" });
    });
  }, [navigate]);

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin + "/app" },
        });
        if (error) throw error;
        // Supabase returns success with an empty identities array when the
        // email is already registered (to prevent enumeration). Detect it.
        if (data.user && data.user.identities && data.user.identities.length === 0) {
          toast.error("That email is already registered. Sign in instead.");
          setMode("signin");
          setLoading(false);
          return;
        }
        toast.success("Account created. You're in.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      navigate({ to: "/app" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setLoading(true);
    if (mode === "signup") {
      sessionStorage.setItem("oauth_intent", "signup");
    } else {
      sessionStorage.removeItem("oauth_intent");
    }
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin + "/auth",
    });
    if (result.error) {
      toast.error(result.error.message ?? "Google sign-in failed");
      setLoading(false);
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/app" });
  }

  return (
    <div className="min-h-screen bg-background paper-texture">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Link to="/" className="font-display text-lg font-semibold">
          Atlas <span className="text-primary">/</span>
        </Link>
      </header>
      <main className="mx-auto flex max-w-md flex-col gap-6 px-6 py-12">
        <div>
          <h1 className="font-display text-4xl font-medium tracking-tight">
            {mode === "signin" ? "Pick up where you left off." : "Take the chair."}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {mode === "signin"
              ? "Your stakeholders are waiting."
              : "We'll boot up a fresh project the moment you arrive."}
          </p>
        </div>

        <Button onClick={handleGoogle} disabled={loading} variant="outline" className="w-full">
          Continue with Google
        </Button>

        <div className="flex items-center gap-3 text-xs uppercase tracking-widest text-muted-foreground">
          <div className="h-px flex-1 bg-border" /> or email <div className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={handleEmail} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "..." : mode === "signin" ? "Sign in" : "Create account"}
          </Button>
        </form>

        <button
          type="button"
          className="text-sm text-muted-foreground underline-offset-4 hover:underline"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
        >
          {mode === "signin" ? "No account yet? Create one." : "Already have an account? Sign in."}
        </button>
      </main>
    </div>
  );
}