import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Set password — Atlas" },
      { name: "description", content: "Set or reset your Atlas email password." },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [validLink, setValidLink] = useState(false);

  const recoveryType = useMemo(() => {
    if (typeof window === "undefined") return null;
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const query = new URLSearchParams(window.location.search);
    return hash.get("type") ?? query.get("type");
  }, []);

  useEffect(() => {
    let cancelled = false;
    const checkRecoverySession = async () => {
      if (recoveryType !== "recovery") {
        setReady(true);
        setValidLink(false);
        return;
      }

      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      setValidLink(Boolean(data.session));
      setReady(true);
    };

    void checkRecoverySession();
    return () => {
      cancelled = true;
    };
  }, [recoveryType]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("Use at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Password set. You can now sign in with email.");
      navigate({ to: "/app/projects", replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not set your password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background paper-texture">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Link to="/" className="font-display text-lg font-semibold">
          Atlas <span className="text-primary">/</span>
        </Link>
        <Link to="/auth" className="text-sm text-muted-foreground hover:text-foreground">
          Sign in
        </Link>
      </header>

      <main className="mx-auto flex max-w-md flex-col gap-6 px-6 pb-16 pt-8">
        <h1 className="text-center font-display text-3xl font-semibold tracking-tight">Set your password</h1>

        {!ready ? (
          <div className="flex justify-center py-10">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : !validLink ? (
          <div className="space-y-4 text-center">
            <p className="text-sm text-muted-foreground">
              This password link is missing or expired. Request a fresh one from the sign-in page.
            </p>
            <Button asChild className="w-full">
              <Link to="/auth">Back to sign in</Link>
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm">New password</Label>
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password" className="text-sm">Confirm password</Label>
              <Input
                id="confirm-password"
                type={showPassword ? "text" : "password"}
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Saving…" : "Save password"}
            </Button>
          </form>
        )}
      </main>
    </div>
  );
}