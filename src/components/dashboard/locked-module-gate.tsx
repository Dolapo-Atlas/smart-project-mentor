import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";
import { getMyAccess } from "@/lib/access.functions";
import { UnlockScreen } from "@/components/dashboard/unlock-screen";

/**
 * Wraps a module that lives beyond the free preview. When the learner's free
 * preview is used up and they haven't paid, the unlock panel replaces the
 * module instead of letting them keep working.
 */
export function LockedModuleGate({ children }: { children: ReactNode }) {
  const fetchAccess = useServerFn(getMyAccess);
  const { data: access, isLoading, isError } = useQuery({
    queryKey: ["my-access"],
    queryFn: () => fetchAccess(),
    staleTime: 0,
    refetchOnMount: "always",
  });

  if (isLoading) {
    return (
      <div className="grid place-items-center py-24 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
      </div>
    );
  }

  // Fail closed: a premium module must never render while access could not be
  // verified. The unlock screen remains the safe, actionable destination.
  if (isError || !access || access.locked) {
    return (
      <div className="py-4">
        <UnlockScreen />
      </div>
    );
  }

  return <>{children}</>;
}
