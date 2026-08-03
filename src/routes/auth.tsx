import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { getActiveProject } from "@/lib/projects.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { AtlasMark } from "@/components/landing/atlas-chrome";
import { CheckCircle2, Sparkles, ShieldCheck } from "lucide-react";

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
  const [resetLoading, setResetLoading] = useState(false);
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
          // Not a new account — just sign them in.
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
    const hasPendingOAuth = sessionStorage.getItem("oauth_pending") === "1";

    if (hasPendingOAuth) {
      setAuthStatus("checking");
      setLoading(true);
    }

    const handleAuthenticatedUser = (user: NonNullable<Awaited<ReturnType<typeof supabase.auth.getUser>>["data"]["user"]>) => {
      if (!cancelled) void routeAuthenticatedUser(user);
    };

    // Check existing session immediately.
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      if (data.session?.user) handleAuthenticatedUser(data.session.user);
      else if (hasPendingOAuth) {
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
    const normalizedEmail = email.trim().toLowerCase();
    setLoading(true);
    setAuthStatus("checking");
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: { emailRedirectTo: window.location.origin + "/auth-callback" },
        });
        if (error) throw error;
        // Supabase returns success with an empty identities array when the
        // email is already registered (to prevent enumeration). Detect it.
        if (data.user && data.user.identities && data.user.identities.length === 0) {
          toast.error("That email already has an account. Use Set password if you first joined with Google.");
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
        const { data, error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
        if (error) throw error;
        if (data.user) {
          await routeAuthenticatedUser(data.user);
          return;
        }
      }
      navigate({ to: "/app/projects", replace: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Authentication failed";
      toast.error(
        message.toLowerCase().includes("invalid login credentials")
          ? "Wrong password, or this Google account does not have a password yet. Tap Set password."
          : message,
      );
      setAuthStatus("idle");
      routingRef.current = false;
      setLoading(false);
    } finally {
      if (!routingRef.current) setLoading(false);
    }
  }

  async function handlePasswordReset() {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      toast.error("Enter your email first.");
      return;
    }
    setResetLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast.success("Check your email for a secure password setup link.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send the password setup email.");
    } finally {
      setResetLoading(false);
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
      redirect_uri: window.location.origin + "/auth-callback",
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
      redirect_uri: window.location.origin + "/auth-callback",
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

  const isSignup = mode === "signup";

  return (
    <div className="min-h-screen bg-background paper-texture lg:grid lg:grid-cols-[1.05fr_1fr]">
      {/* Editorial panel — content and accent change per mode */}
      <aside
        className={[
          "relative hidden overflow-hidden px-12 py-14 lg:flex lg:flex-col lg:justify-between",
          isSignup ? "bg-navy text-navy-foreground" : "bg-secondary text-foreground",
        ].join(" ")}
      >
        <div
          aria-hidden
          className={[
            "pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full blur-3xl",
            isSignup ? "bg-accent-orange/25" : "bg-primary/10",
          ].join(" ")}
        />
        <Link to="/" className="relative flex items-center gap-3">
          <AtlasMark className="h-10 w-10" />
          <span className="font-display text-xl font-semibold tracking-tight">Atlas</span>
        </Link>

        <div className="relative max-w-md">
          <span
            className={[
              "inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]",
              isSignup
                ? "bg-accent-orange/20 text-accent-orange"
                : "bg-primary/10 text-primary",
            ].join(" ")}
          >
            {isSignup ? <Sparkles className="h-3.5 w-3.5" /> : <ShieldCheck className="h-3.5 w-3.5" />}
            {isSignup ? "New account" : "Welcome back"}
          </span>
          <h2 className="mt-6 font-display text-4xl leading-tight font-semibold tracking-tight">
            {isSignup
              ? "Start your first day on a real programme."
              : "Pick up exactly where you left off."}
          </h2>
          <p className={["mt-4 text-sm leading-relaxed", isSignup ? "text-navy-foreground/75" : "text-muted-foreground"].join(" ")}>
            {isSignup
              ? "Atlas puts you inside a live digital care records programme — real emails, real stakeholders, real consequences."
              : "Your project, tasks, inbox and progress are waiting in the state you left them."}
          </p>
          <ul className="mt-8 space-y-3 text-sm">
            {(isSignup
              ? ["Start free preview — no card required", "First workplace task in under 5 minutes", "Unlock full access when you're ready"]
              : ["Your project state is saved day by day", "Deliverables and feedback kept in place", "Secure sign-in with Google, Apple or SSO"]
            ).map((line) => (
              <li key={line} className="flex items-start gap-3">
                <CheckCircle2
                  className={["mt-0.5 h-4 w-4 shrink-0", isSignup ? "text-accent-orange" : "text-primary"].join(" ")}
                />
                <span className={isSignup ? "text-navy-foreground/85" : "text-muted-foreground"}>{line}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className={["relative text-xs", isSignup ? "text-navy-foreground/55" : "text-muted-foreground"].join(" ")}>
          atlassim.co — workplace experience simulation
        </p>
      </aside>

      <main className="flex min-h-screen flex-col px-6 py-8 sm:px-10 lg:px-14">
        <header className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 lg:invisible">
            <AtlasMark className="h-8 w-8" />
            <span className="font-display text-lg font-semibold">Atlas</span>
          </Link>
          <div className="flex items-center gap-2 text-sm">
            <span className="hidden text-muted-foreground sm:inline">
              {isSignup ? "Already have an account?" : "New to Atlas?"}
            </span>
            <button
              type="button"
              onClick={() => setMode(isSignup ? "signin" : "signup")}
              className="rounded-full border border-border px-4 py-1.5 font-medium transition hover:bg-muted/50"
            >
              {isSignup ? "Log in" : "Create account"}
            </button>
          </div>
        </header>

        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 py-10">
        <div>
          <p
            className={[
              "text-[11px] font-semibold uppercase tracking-[0.18em]",
              isSignup ? "text-accent-orange" : "text-primary",
            ].join(" ")}
          >
            {isSignup ? "Step 1 of 2 — create account" : "Sign in"}
          </p>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">
            {isSignup ? "Create your Atlas account" : "Log in to Atlas"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {isSignup
              ? "Start your free preview. Your first workplace task is waiting."
              : "Enter your details to return to your programme."}
          </p>
        </div>

        <div className="space-y-3">
          <button
            type="button"
            onClick={handleGoogle}
            disabled={loading}
            className="flex w-full items-center justify-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:opacity-50"
          >
            <GoogleIcon />
            {mode === "signin" ? "Log in with Google" : "Sign up with Google"}
          </button>
          <button
            type="button"
            onClick={handleApple}
            disabled={loading}
            className="flex w-full items-center justify-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:opacity-50"
          >
            <AppleIcon />
            {mode === "signin" ? "Log in with Apple" : "Sign up with Apple"}
          </button>
          <button
            type="button"
            onClick={handleSSO}
            disabled={loading}
            className="flex w-full items-center justify-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:opacity-50"
          >
            <SSOIcon />
            {mode === "signin" ? "Log in with SSO" : "Sign up with SSO"}
          </button>
        </div>

        <div className="flex items-center gap-3 text-xs uppercase tracking-widest text-muted-foreground">
          <div className="h-px flex-1 bg-border" /> or <div className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={handleEmail} className="space-y-4 rounded-2xl border border-border/70 bg-card/70 p-5 shadow-sm">
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
              <Label htmlFor="password" className="text-sm">
                {isSignup ? "Create a password" : "Password"}
              </Label>
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
            {isSignup && (
              <p className="text-xs text-muted-foreground">At least 6 characters.</p>
            )}
          </div>
          <Button
            type="submit"
            size="lg"
            disabled={loading}
            className={[
              "w-full transition",
              isSignup ? "bg-accent-orange text-accent-orange-foreground hover:bg-accent-orange/90" : "",
            ].join(" ")}
          >
            {loading ? "..." : isSignup ? "Create account — start free preview" : "Log in"}
          </Button>
        </form>

        {!isSignup && (
          <button
            type="button"
            onClick={handlePasswordReset}
            disabled={resetLoading || loading}
            className="text-center text-sm font-medium text-primary underline-offset-4 hover:underline disabled:opacity-50"
          >
            {resetLoading ? "Sending password link…" : "Set or reset email password"}
          </button>
        )}

        <p className="text-center text-xs text-muted-foreground">
          By continuing, you agree to Atlas's{" "}
          <Link to="/" className="underline underline-offset-2 hover:text-foreground">Terms</Link>{" "}
          and{" "}
          <Link to="/" className="underline underline-offset-2 hover:text-foreground">Privacy Policy</Link>.
        </p>
        </div>
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