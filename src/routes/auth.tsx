import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { checkEmailAllowed } from "@/lib/signup.functions";
import { getActiveProject } from "@/lib/projects.functions";
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
  const fetchActiveProject = useServerFn(getActiveProject);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [authStatus, setAuthStatus] = useState<"idle" | "redirecting" | "checking">(() =>
    typeof window !== "undefined" && sessionStorage.getItem("oauth_pending") === "1" ? "checking" : "idle",
  );
  const routingRef = useRef(false);

  const routeAuthenticatedUser = useCallback(
    async (
      user: NonNullable<Awaited<ReturnType<typeof supabase.auth.getUser>>["data"]["user"]>,
    ) => {
      if (routingRef.current) return;
      routingRef.current = true;
      setAuthStatus("checking");
      setLoading(true);

      const intent = sessionStorage.getItem("oauth_intent");
      if (intent === "signup") {
        const createdAt = new Date(user.created_at ?? 0).getTime();
        const isNew = Date.now() - createdAt < 60_000;
        if (!isNew) {
          await supabase.auth.signOut();
          sessionStorage.removeItem("oauth_intent");
          sessionStorage.removeItem("oauth_pending");
          toast.error("That Google account is already registered. Sign in instead.");
          setMode("signin");
          setAuthStatus("idle");
          setLoading(false);
          routingRef.current = false;
          return;
        }

        const userEmail = user.email ?? "";
        const { allowed } = await checkEmailAllowed({ data: { email: userEmail } });
        if (!allowed) {
          await supabase.auth.signOut();
          sessionStorage.removeItem("oauth_intent");
          sessionStorage.removeItem("oauth_pending");
          toast.error("Atlas is invite-only right now. Join the waitlist on the homepage.");
          setMode("signin");
          setAuthStatus("idle");
          setLoading(false);
          routingRef.current = false;
          return;
        }
      }

      sessionStorage.removeItem("oauth_intent");
      sessionStorage.removeItem("oauth_pending");

      let hasActiveProject = false;
      try {
        hasActiveProject = !!(await fetchActiveProject());
      } catch {
        // If the project check races the fresh session, let the protected app
        // route decide. The loading screen still prevents the login-page flash.
      }

      navigate({ to: hasActiveProject ? "/app" : "/app/projects", replace: true });
    },
    [fetchActiveProject, navigate],
  );

  useEffect(() => {
    let cancelled = false;
    let fallbackTimer: number | undefined;

    const handleAuthenticatedUser = (user: NonNullable<Awaited<ReturnType<typeof supabase.auth.getUser>>["data"]["user"]>) => {
      if (!cancelled) void routeAuthenticatedUser(user);
    };

    // Check existing session immediately.
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      if (data.session?.user) handleAuthenticatedUser(data.session.user);
      else if (sessionStorage.getItem("oauth_pending") === "1") {
        fallbackTimer = window.setTimeout(async () => {
          if (cancelled) return;
          const latest = await supabase.auth.getSession();
          if (latest.data.session?.user) {
            handleAuthenticatedUser(latest.data.session.user);
            return;
          }
          sessionStorage.removeItem("oauth_pending");
          setAuthStatus("idle");
          setLoading(false);
        }, 3500);
      }
    });

    // Also react to sign-in events (e.g. Google OAuth completing after redirect).
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === "SIGNED_IN" || event === "INITIAL_SESSION") && session?.user) {
        handleAuthenticatedUser(session.user);
      }
    });

    return () => {
      cancelled = true;
      if (fallbackTimer) window.clearTimeout(fallbackTimer);
      sub.subscription.unsubscribe();
    };
  }, [routeAuthenticatedUser]);

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setAuthStatus("checking");
    try {
      if (mode === "signup") {
        const { allowed } = await checkEmailAllowed({ data: { email } });
        if (!allowed) {
          toast.error("Atlas is invite-only right now. Join the waitlist on the homepage.");
          setAuthStatus("idle");
          setLoading(false);
          return;
        }
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin + "/auth" },
        });
        if (error) throw error;
        // Supabase returns success with an empty identities array when the
        // email is already registered (to prevent enumeration). Detect it.
        if (data.user && data.user.identities && data.user.identities.length === 0) {
          toast.error("That email is already registered. Sign in instead.");
          setMode("signin");
          setAuthStatus("idle");
          setLoading(false);
          return;
        }
        toast.success("Account created. You're in.");
        if (data.user) {
          await routeAuthenticatedUser(data.user);
          return;
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (data.user) {
          await routeAuthenticatedUser(data.user);
          return;
        }
      }
      navigate({ to: "/app/projects", replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Authentication failed");
      setAuthStatus("idle");
      routingRef.current = false;
      setLoading(false);
    } finally {
      if (!routingRef.current) setLoading(false);
    }
  }

  async function handleGoogle() {
    setLoading(true);
    setAuthStatus("redirecting");
    sessionStorage.setItem("oauth_pending", "1");
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
      sessionStorage.removeItem("oauth_pending");
      setAuthStatus("idle");
      setLoading(false);
      return;
    }
    if (result.redirected) return;
    const { data } = await supabase.auth.getUser();
    if (data.user) await routeAuthenticatedUser(data.user);
  }

  async function handleSSO() {
    const value = window.prompt("Enter your work email to continue with SSO");
    if (!value) return;
    const domain = value.split("@")[1]?.trim().toLowerCase();
    if (!domain) {
      toast.error("Please enter a valid work email.");
      return;
    }
    setLoading(true);
    setAuthStatus("redirecting");
    try {
      const { data, error } = await supabase.auth.signInWithSSO({ domain });
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "SSO not configured for that domain.");
      setAuthStatus("idle");
      setLoading(false);
    }
  }

  async function handleApple() {
    setLoading(true);
    setAuthStatus("redirecting");
    sessionStorage.setItem("oauth_pending", "1");
    if (mode === "signup") {
      sessionStorage.setItem("oauth_intent", "signup");
    } else {
      sessionStorage.removeItem("oauth_intent");
    }
    const result = await lovable.auth.signInWithOAuth("apple", {
      redirect_uri: window.location.origin + "/auth",
    });
    if (result.error) {
      toast.error(result.error.message ?? "Apple sign-in failed");
      sessionStorage.removeItem("oauth_pending");
      setAuthStatus("idle");
      setLoading(false);
      return;
    }
    if (result.redirected) return;
    const { data } = await supabase.auth.getUser();
    if (data.user) await routeAuthenticatedUser(data.user);
  }

  if (authStatus !== "idle") {
    return (
      <AuthTransition
        message={authStatus === "redirecting" ? "Opening secure sign-in…" : "Preparing your workspace…"}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background paper-texture">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Link to="/" className="font-display text-lg font-semibold">
          Atlas <span className="text-primary">/</span>
        </Link>
        <button
          type="button"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          {mode === "signin" ? "Sign up" : "Sign in"}
        </button>
      </header>
      <main className="mx-auto flex max-w-md flex-col gap-6 px-6 pb-16 pt-8">
        <h1 className="text-center font-display text-3xl font-semibold tracking-tight">
          {mode === "signin" ? "Log in to Atlas" : "Create your Atlas account"}
        </h1>

        <div className="space-y-3">
          <button
            type="button"
            onClick={handleGoogle}
            disabled={loading}
            className="flex w-full items-center justify-center gap-3 rounded-lg border border-border bg-background px-4 py-3 text-sm font-medium transition hover:bg-muted/40 disabled:opacity-50"
          >
            <GoogleIcon />
            {mode === "signin" ? "Log in with Google" : "Sign up with Google"}
          </button>
          <button
            type="button"
            onClick={handleApple}
            disabled={loading}
            className="flex w-full items-center justify-center gap-3 rounded-lg border border-border bg-background px-4 py-3 text-sm font-medium transition hover:bg-muted/40 disabled:opacity-50"
          >
            <AppleIcon />
            {mode === "signin" ? "Log in with Apple" : "Sign up with Apple"}
          </button>
          <button
            type="button"
            onClick={handleSSO}
            disabled={loading}
            className="flex w-full items-center justify-center gap-3 rounded-lg border border-border bg-background px-4 py-3 text-sm font-medium transition hover:bg-muted/40 disabled:opacity-50"
          >
            <SSOIcon />
            {mode === "signin" ? "Log in with SSO" : "Sign up with SSO"}
          </button>
        </div>

        <div className="flex items-center gap-3 text-xs uppercase tracking-widest text-muted-foreground">
          <div className="h-px flex-1 bg-border" /> or <div className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={handleEmail} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm">Work email</Label>
            <Input
              id="email"
              type="email"
              required
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-sm">Password</Label>
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
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
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "..." : "Continue"}
          </Button>
        </form>

        <p className="text-center text-xs text-muted-foreground">
          By continuing, you agree to Atlas's{" "}
          <Link to="/" className="underline underline-offset-2 hover:text-foreground">Terms</Link>{" "}
          and{" "}
          <Link to="/" className="underline underline-offset-2 hover:text-foreground">Privacy Policy</Link>.
        </p>
      </main>
    </div>
  );
}

function AuthTransition({ message }: { message: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background paper-texture px-6 text-center">
      <div className="w-full max-w-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-primary/30 bg-primary/10">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
        <h1 className="mt-6 font-display text-3xl font-semibold tracking-tight text-foreground">Atlas</h1>
        <p className="mt-2 text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16.1 19 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35 26.7 36 24 36c-5.3 0-9.7-3.4-11.3-8l-6.5 5C9.6 39.6 16.2 44 24 44z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4 5.6l6.2 5.2C41.1 35.6 44 30.2 44 24c0-1.2-.1-2.3-.4-3.5z"/>
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg width="16" height="18" viewBox="0 0 16 18" fill="currentColor" aria-hidden="true">
      <path d="M13.3 9.6c0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.1-2.8.8-3.5.8-.7 0-1.9-.8-3.1-.8C3.7 4.3 2 5.6 1 7.6c-1.7 3-.4 7.4 1.2 9.8.8 1.2 1.8 2.5 3 2.5 1.2-.1 1.7-.8 3.2-.8s1.9.8 3.2.8c1.3 0 2.1-1.2 2.9-2.4.9-1.4 1.3-2.7 1.3-2.8-.1 0-2.5-1-2.5-3.8zM11 2.7c.6-.7 1.1-1.8 1-2.7-.9 0-2 .6-2.7 1.4-.6.6-1.1 1.7-1 2.7 1 .1 2.1-.5 2.7-1.4z"/>
    </svg>
  );
}

function SSOIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" />
    </svg>
  );
}