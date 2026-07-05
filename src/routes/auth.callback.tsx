import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/auth/callback")({
  beforeLoad: () => {
    throw redirect({ to: "/auth" });
  },
  component: AuthCallback,
});

function AuthCallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background paper-texture px-6 text-center">
      <div className="w-full max-w-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-primary/30 bg-primary/10">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
        <h1 className="mt-6 font-display text-3xl font-semibold tracking-tight text-foreground">Atlas</h1>
        <p className="mt-2 text-sm text-muted-foreground">Preparing your workspace…</p>
      </div>
    </div>
  );
}